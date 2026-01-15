"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, ScanResults } from "@/lib/types"
import { scanDirectories } from "@/lib/services/scanner"
import { revalidatePath } from "next/cache"

/**
 * Triggers a full scan of all configured directories
 */
export async function triggerScan(): Promise<ActionResult<ScanResults>> {
  try {
    // Get enabled scan directories
    const scanDirs = await prisma.scanDirectory.findMany({
      where: { enabled: true },
    })

    if (scanDirs.length === 0) {
      return {
        success: false,
        error: "No scan directories configured. Add directories in Settings.",
      }
    }

    // Scan all directories
    const scanResults = await scanDirectories(
      scanDirs.map((d: { path: string; enabled: boolean }) => ({ path: d.path, enabled: d.enabled }))
    )

    // Get existing repos by original path for comparison
    const existingRepos = await prisma.repository.findMany({
      select: { id: true, originalPath: true },
    })

    const existingPathMap = new Map(
      existingRepos.map((r: { id: number; originalPath: string }) => [r.originalPath.toLowerCase(), r.id])
    )

    let newRepos = 0
    let updatedRepos = 0

    // Process scan results
    for (const result of scanResults) {
      const normalizedPath = result.path.toLowerCase()
      const existingId = existingPathMap.get(normalizedPath)

      if (existingId) {
        // Update existing repo
        await prisma.repository.update({
          where: { id: existingId },
          data: {
            remoteUrl: result.remoteUrl,
            lastCommitSha: result.lastCommitSha,
            isDirty: result.isDirty,
          },
        })
        updatedRepos++
      } else {
        // Create new repo
        await prisma.repository.create({
          data: {
            name: result.name,
            originalPath: result.path,
            remoteUrl: result.remoteUrl,
            lastCommitSha: result.lastCommitSha,
            isDirty: result.isDirty,
            triageStatus: "pending",
          },
        })
        newRepos++
      }
    }

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: {
        newRepos,
        updatedRepos,
        totalScanned: scanResults.length,
      },
      message: `Found ${newRepos} new repositories, updated ${updatedRepos}`,
    }
  } catch (error) {
    console.error("Scan error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Scan failed",
    }
  }
}

/**
 * Refreshes status of existing repositories (dirty flag, SHA)
 */
export async function refreshRepositoryStatus(
  repoId: number
): Promise<ActionResult> {
  try {
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
    })

    if (!repo) {
      return {
        success: false,
        error: "Repository not found",
      }
    }

    // Re-scan this specific repo
    const { getRepoInfo } = await import("@/lib/utils/git")
    const currentPath = repo.physicalPath || repo.originalPath

    try {
      const info = await getRepoInfo(currentPath)

      await prisma.repository.update({
        where: { id: repoId },
        data: {
          lastCommitSha: info.lastCommitSha,
          isDirty: info.isDirty,
          remoteUrl: info.remoteUrl,
        },
      })

      revalidatePath("/dashboard/repos")

      return {
        success: true,
        data: undefined,
        message: "Repository status refreshed",
      }
    } catch {
      return {
        success: false,
        error: "Could not access repository. It may have been moved or deleted.",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh status",
    }
  }
}
