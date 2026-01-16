"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, ScanResults } from "@/lib/types"
import { scanDirectoriesWithProgress } from "@/lib/services/scanner"
import { normalizeWindowsPath } from "@/lib/utils/path"
import { revalidatePath } from "next/cache"
import {
  startScan,
  completeScan,
  failScan,
  isScanInProgress,
  getScanProgress,
  cancelScan,
} from "@/lib/services/scan-progress"
import type { ScanProgress } from "@/lib/services/scan-progress"

// Simple in-memory rate limiting for scan operations
let lastScanTime = 0
const SCAN_COOLDOWN_MS = 5000 // 5 second cooldown between scans

/**
 * Get current scan progress
 */
export async function getScanProgressAction(): Promise<ScanProgress> {
  return getScanProgress()
}

/**
 * Triggers a full scan of all configured directories
 */
export async function triggerScan(): Promise<ActionResult<ScanResults>> {
  try {
    // Check if scan is already in progress
    if (isScanInProgress()) {
      return {
        success: false,
        error: "A scan is already in progress",
      }
    }

    // Rate limiting check
    const now = Date.now()
    if (now - lastScanTime < SCAN_COOLDOWN_MS) {
      return {
        success: false,
        error: `Please wait ${Math.ceil((SCAN_COOLDOWN_MS - (now - lastScanTime)) / 1000)} seconds before scanning again`,
      }
    }
    lastScanTime = now

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

    // Start progress tracking
    startScan(scanDirs.length)

    // Scan all directories with progress reporting
    const scanResults = await scanDirectoriesWithProgress(
      scanDirs.map((d: { path: string; enabled: boolean }) => ({ path: d.path, enabled: d.enabled }))
    )

    // Get existing repos by original path for comparison
    const existingRepos = await prisma.repository.findMany({
      select: { id: true, originalPath: true },
    })

    // Use normalized paths for comparison (case-insensitive on Windows)
    const existingPathMap = new Map(
      existingRepos.map((r: { id: number; originalPath: string }) => [
        normalizeWindowsPath(r.originalPath).toLowerCase(),
        r.id
      ])
    )

    let newRepos = 0
    let updatedRepos = 0

    // Process scan results
    for (const result of scanResults) {
      // Normalize the path for consistent storage and comparison
      const storedPath = normalizeWindowsPath(result.path)
      const lookupPath = storedPath.toLowerCase()
      const existingId = existingPathMap.get(lookupPath)

      if (existingId) {
        // Update existing repo - only update theme if not already set (preserve manual assignments)
        const existingRepo = await prisma.repository.findUnique({
          where: { id: existingId },
          select: { theme: true },
        })

        await prisma.repository.update({
          where: { id: existingId },
          data: {
            remoteUrl: result.remoteUrl,
            lastCommitSha: result.lastCommitSha,
            isDirty: result.isDirty,
            // Only set theme if not already assigned
            ...(existingRepo && !existingRepo.theme && result.suggestedTheme
              ? { theme: result.suggestedTheme }
              : {}),
          },
        })
        updatedRepos++
      } else {
        // Create new repo with normalized path and suggested theme
        await prisma.repository.create({
          data: {
            name: result.name,
            originalPath: storedPath,
            remoteUrl: result.remoteUrl,
            lastCommitSha: result.lastCommitSha,
            isDirty: result.isDirty,
            triageStatus: "pending",
            theme: result.suggestedTheme || null,
          },
        })
        newRepos++
      }
    }

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")
    revalidatePath("/dashboard")

    // Mark scan as completed
    completeScan(scanResults.length)

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
    const errorMessage = error instanceof Error ? error.message : "Scan failed"
    failScan(errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Stops a scan in progress
 */
export async function stopScan(): Promise<ActionResult> {
  try {
    if (!isScanInProgress()) {
      return {
        success: false,
        error: "No scan is currently in progress",
      }
    }

    cancelScan()

    return {
      success: true,
      data: undefined,
      message: "Scan stopped",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop scan",
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
