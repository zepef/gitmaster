"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, settingsSchema, scanDirSchema } from "@/lib/types"
import { revalidatePath } from "next/cache"
import * as fs from "fs/promises"

/**
 * Gets the current settings (creates default if none exist)
 */
export async function getSettings() {
  let settings = await prisma.settings.findFirst()

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        autoTriageEnabled: false,
      },
    })
  }

  return settings
}

/**
 * Updates application settings
 */
export async function updateSettings(
  data: Partial<{
    organizationRoot: string
    autoTriageEnabled: boolean
    backupDestination: string
  }>
): Promise<ActionResult> {
  try {
    // Validate organization root if provided
    if (data.organizationRoot) {
      const validation = settingsSchema.safeParse({
        organizationRoot: data.organizationRoot,
      })

      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid path",
        }
      }

      // Verify directory exists or can be created
      try {
        await fs.access(data.organizationRoot)
      } catch {
        // Try to create the directory
        try {
          await fs.mkdir(data.organizationRoot, { recursive: true })
        } catch (mkdirError) {
          return {
            success: false,
            error: `Cannot access or create directory: ${data.organizationRoot}`,
          }
        }
      }
    }

    const settings = await getSettings()

    await prisma.settings.update({
      where: { id: settings.id },
      data,
    })

    revalidatePath("/dashboard/settings")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: undefined,
      message: "Settings saved",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    }
  }
}

/**
 * Gets all scan directories
 */
export async function getScanDirectories() {
  return prisma.scanDirectory.findMany({
    orderBy: { createdAt: "asc" },
  })
}

/**
 * Adds a new scan directory
 */
export async function addScanDirectory(
  path: string,
  isWsl: boolean = false
): Promise<ActionResult> {
  try {
    const validation = scanDirSchema.safeParse({ path, isWsl })

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid path",
      }
    }

    // Check if directory exists
    try {
      const stat = await fs.stat(path)
      if (!stat.isDirectory()) {
        return {
          success: false,
          error: "Path is not a directory",
        }
      }
    } catch {
      return {
        success: false,
        error: "Directory does not exist or is not accessible",
      }
    }

    // Check for duplicates
    const existing = await prisma.scanDirectory.findUnique({
      where: { path },
    })

    if (existing) {
      return {
        success: false,
        error: "This directory is already configured",
      }
    }

    await prisma.scanDirectory.create({
      data: {
        path,
        isWsl,
        enabled: true,
      },
    })

    revalidatePath("/dashboard/settings")

    return {
      success: true,
      data: undefined,
      message: "Scan directory added",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add scan directory",
    }
  }
}

/**
 * Removes a scan directory
 */
export async function removeScanDirectory(id: number): Promise<ActionResult> {
  try {
    await prisma.scanDirectory.delete({
      where: { id },
    })

    revalidatePath("/dashboard/settings")

    return {
      success: true,
      data: undefined,
      message: "Scan directory removed",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove scan directory",
    }
  }
}

/**
 * Toggles a scan directory's enabled status
 */
export async function toggleScanDirectory(id: number): Promise<ActionResult> {
  try {
    const dir = await prisma.scanDirectory.findUnique({
      where: { id },
    })

    if (!dir) {
      return {
        success: false,
        error: "Scan directory not found",
      }
    }

    await prisma.scanDirectory.update({
      where: { id },
      data: { enabled: !dir.enabled },
    })

    revalidatePath("/dashboard/settings")

    return {
      success: true,
      data: undefined,
      message: dir.enabled ? "Scan directory disabled" : "Scan directory enabled",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle scan directory",
    }
  }
}

/**
 * Checks if initial setup is complete
 */
export async function isSetupComplete(): Promise<boolean> {
  const settings = await getSettings()
  const scanDirs = await getScanDirectories()

  return !!(settings.organizationRoot && scanDirs.length > 0)
}
