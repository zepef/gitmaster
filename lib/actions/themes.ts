"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, themeSchema, DEFAULT_THEMES } from "@/lib/types"
import { revalidatePath } from "next/cache"

/**
 * Gets all themes
 */
export async function getThemes() {
  return prisma.theme.findMany({
    orderBy: { name: "asc" },
  })
}

/**
 * Gets a single theme by name
 */
export async function getThemeByName(name: string) {
  return prisma.theme.findUnique({
    where: { name },
  })
}

/**
 * Creates a new theme
 */
export async function createTheme(data: {
  name: string
  color?: string
  description?: string
}): Promise<ActionResult<{ id: number; name: string }>> {
  try {
    const validation = themeSchema.safeParse(data)

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid theme data",
      }
    }

    // Check for duplicate name
    const existing = await prisma.theme.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return {
        success: false,
        error: "A theme with this name already exists",
      }
    }

    const theme = await prisma.theme.create({
      data: {
        name: data.name,
        color: data.color || "#6B7280",
        description: data.description,
      },
    })

    revalidatePath("/dashboard/settings")
    revalidatePath("/dashboard/repos")

    return {
      success: true,
      data: { id: theme.id, name: theme.name },
      message: `Theme "${theme.name}" created`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create theme",
    }
  }
}

/**
 * Updates an existing theme
 */
export async function updateTheme(
  id: number,
  data: Partial<{ name: string; color: string; description: string }>
): Promise<ActionResult> {
  try {
    // Validate name if provided
    if (data.name) {
      const validation = themeSchema.safeParse({ name: data.name, color: data.color })

      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid theme data",
        }
      }

      // Check for duplicate name (excluding current theme)
      const existing = await prisma.theme.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      })

      if (existing) {
        return {
          success: false,
          error: "A theme with this name already exists",
        }
      }
    }

    await prisma.theme.update({
      where: { id },
      data,
    })

    revalidatePath("/dashboard/settings")
    revalidatePath("/dashboard/repos")

    return {
      success: true,
      data: undefined,
      message: "Theme updated",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update theme",
    }
  }
}

/**
 * Deletes a theme
 */
export async function deleteTheme(id: number): Promise<ActionResult> {
  try {
    // Check if any repos use this theme
    const theme = await prisma.theme.findUnique({
      where: { id },
    })

    if (!theme) {
      return {
        success: false,
        error: "Theme not found",
      }
    }

    const reposWithTheme = await prisma.repository.count({
      where: { theme: theme.name },
    })

    if (reposWithTheme > 0) {
      return {
        success: false,
        error: `Cannot delete theme: ${reposWithTheme} repositories are using it`,
      }
    }

    await prisma.theme.delete({
      where: { id },
    })

    revalidatePath("/dashboard/settings")

    return {
      success: true,
      data: undefined,
      message: `Theme "${theme.name}" deleted`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete theme",
    }
  }
}

/**
 * Creates the default themes (for first-time setup)
 */
export async function createDefaultThemes(): Promise<ActionResult> {
  try {
    const existingThemes = await prisma.theme.count()

    if (existingThemes > 0) {
      return {
        success: false,
        error: "Themes already exist",
      }
    }

    await prisma.theme.createMany({
      data: DEFAULT_THEMES.map((t) => ({
        name: t.name,
        color: t.color,
        description: t.description,
      })),
    })

    revalidatePath("/dashboard/settings")

    return {
      success: true,
      data: undefined,
      message: `Created ${DEFAULT_THEMES.length} default themes`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create default themes",
    }
  }
}
