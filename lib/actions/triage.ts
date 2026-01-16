"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, MovePreview, MoveResult, MoveOptions, DEFAULT_MOVE_OPTIONS } from "@/lib/types"
import { joinPaths, generateConflictFreePath, normalizeWindowsPath, isSameDrive, getRepoNameFromPath } from "@/lib/utils/path"
import { revalidatePath } from "next/cache"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Generates a preview of proposed moves without executing them
 */
export async function generateMovePreview(
  repoIds: number[]
): Promise<ActionResult<MovePreview[]>> {
  try {
    const settings = await prisma.settings.findFirst()

    if (!settings?.organizationRoot) {
      return {
        success: false,
        error: "Organization root not configured. Update Settings first.",
      }
    }

    const repos = await prisma.repository.findMany({
      where: { id: { in: repoIds } },
    })

    if (repos.length === 0) {
      return {
        success: false,
        error: "No repositories found",
      }
    }

    // Get all existing paths in organization root
    const existingPaths = await getExistingPaths(settings.organizationRoot)

    const previews: MovePreview[] = []

    for (const repo of repos) {
      if (!repo.theme) {
        previews.push({
          repoId: repo.id,
          repoName: repo.name,
          from: repo.originalPath,
          to: "",
          theme: "",
          conflicts: ["No theme assigned"],
          warnings: [],
        })
        continue
      }

      const targetDir = joinPaths(settings.organizationRoot, repo.theme)
      let targetPath = joinPaths(targetDir, repo.name)

      const conflicts: string[] = []
      const warnings: string[] = []

      // Check for dirty repo
      if (repo.isDirty) {
        warnings.push("Repository has uncommitted changes")
      }

      // Check for cross-drive move
      const sourcePath = repo.physicalPath || repo.originalPath
      if (!isSameDrive(sourcePath, targetPath)) {
        warnings.push("Cross-drive move (will copy and delete)")
      }

      // Check for existing target
      const normalizedTarget = normalizeWindowsPath(targetPath).toLowerCase()
      if (existingPaths.has(normalizedTarget)) {
        const newPath = generateConflictFreePath(targetPath, Array.from(existingPaths))
        warnings.push(`Path conflict: will use ${getRepoNameFromPath(newPath)}`)
        targetPath = newPath
      }

      // Add to existing paths to detect conflicts within this batch
      existingPaths.add(normalizeWindowsPath(targetPath).toLowerCase())

      previews.push({
        repoId: repo.id,
        repoName: repo.name,
        from: sourcePath,
        to: targetPath,
        theme: repo.theme,
        conflicts,
        warnings,
      })
    }

    return {
      success: true,
      data: previews,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate preview",
    }
  }
}

/**
 * Gets all existing directory paths within a root
 */
async function getExistingPaths(root: string): Promise<Set<string>> {
  const paths = new Set<string>()

  try {
    const themes = await fs.readdir(root, { withFileTypes: true })

    for (const theme of themes) {
      if (!theme.isDirectory()) continue

      const themePath = path.join(root, theme.name)
      const repos = await fs.readdir(themePath, { withFileTypes: true })

      for (const repo of repos) {
        if (repo.isDirectory()) {
          const repoPath = normalizeWindowsPath(path.join(themePath, repo.name)).toLowerCase()
          paths.add(repoPath)
        }
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return paths
}

/**
 * Executes the actual file moves
 */
export async function executeMoves(
  moves: MovePreview[],
  options: MoveOptions = DEFAULT_MOVE_OPTIONS
): Promise<ActionResult<{ successful: number; failed: number; results: MoveResult[] }>> {
  try {
    // Filter out moves with conflicts
    const validMoves = moves.filter((m) => m.conflicts.length === 0 && m.to !== "")

    if (validMoves.length === 0) {
      return {
        success: false,
        error: "No valid moves to execute. Resolve conflicts first.",
      }
    }

    const results: MoveResult[] = []
    let successful = 0
    let failed = 0

    for (const move of validMoves) {
      try {
        // Ensure target directory exists
        const targetDir = path.dirname(move.to)
        await fs.mkdir(targetDir, { recursive: true })

        // Check if source exists
        try {
          await fs.access(move.from)
        } catch {
          results.push({
            success: false,
            repoId: move.repoId,
            repoName: move.repoName,
            from: move.from,
            to: move.to,
            error: "Source directory not found",
          })
          failed++
          continue
        }

        // Check if target already exists
        try {
          await fs.access(move.to)
          if (options.handleConflicts === "skip") {
            results.push({
              success: false,
              repoId: move.repoId,
              repoName: move.repoName,
              from: move.from,
              to: move.to,
              error: "Target already exists (skipped)",
            })
            failed++
            continue
          } else if (options.handleConflicts === "fail") {
            results.push({
              success: false,
              repoId: move.repoId,
              repoName: move.repoName,
              from: move.from,
              to: move.to,
              error: "Target already exists",
            })
            failed++
            continue
          }
          // 'suffix' case: path should already be adjusted in preview
        } catch {
          // Target doesn't exist - good!
        }

        // Perform the move
        if (isSameDrive(move.from, move.to)) {
          // Same drive - use rename (fast)
          await fs.rename(move.from, move.to)
        } else {
          // Cross-drive - copy then delete
          await copyDirectory(move.from, move.to)
          await fs.rm(move.from, { recursive: true, force: true })
        }

        // Update database
        await prisma.repository.update({
          where: { id: move.repoId },
          data: {
            physicalPath: normalizeWindowsPath(move.to),
            triageStatus: "auto",
          },
        })

        results.push({
          success: true,
          repoId: move.repoId,
          repoName: move.repoName,
          from: move.from,
          to: move.to,
        })
        successful++
      } catch (error) {
        results.push({
          success: false,
          repoId: move.repoId,
          repoName: move.repoName,
          from: move.from,
          to: move.to,
          error: error instanceof Error ? error.message : "Move failed",
        })
        failed++
      }
    }

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: { successful, failed, results },
      message: `Moved ${successful} repositories${failed > 0 ? `, ${failed} failed` : ""}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute moves",
    }
  }
}

/**
 * Recursively copies a directory, preserving symlinks
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })

  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isSymbolicLink()) {
      // Preserve symbolic links
      const linkTarget = await fs.readlink(srcPath)
      await fs.symlink(linkTarget, destPath)
    } else if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

/**
 * Gets repositories ready for triage (have theme but not moved)
 */
export async function getTriageReady() {
  return prisma.repository.findMany({
    where: {
      theme: { not: null },
      physicalPath: null,
      triageStatus: { in: ["pending", "manual"] },
    },
    orderBy: { theme: "asc" },
  })
}
