"use server"

import { prisma } from "@/lib/prisma"
import { ActionResult, TriageStatus, assignThemeSchema, bulkAssignThemeSchema } from "@/lib/types"
import { revalidatePath } from "next/cache"

/**
 * Gets all repositories with optional filtering
 */
export async function getRepositories(filters?: {
  status?: TriageStatus | 'all'
  theme?: string
  search?: string
  isDirty?: boolean
}) {
  const where: Record<string, unknown> = {}

  if (filters?.status && filters.status !== 'all') {
    where.triageStatus = filters.status
  }

  if (filters?.theme) {
    where.theme = filters.theme
  }

  if (filters?.isDirty !== undefined) {
    where.isDirty = filters.isDirty
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { originalPath: { contains: filters.search } },
      { remoteUrl: { contains: filters.search } },
    ]
  }

  return prisma.repository.findMany({
    where,
    orderBy: [{ triageStatus: 'asc' }, { name: 'asc' }],
  })
}

/**
 * Gets a single repository by ID
 */
export async function getRepository(id: number) {
  return prisma.repository.findUnique({
    where: { id },
  })
}

/**
 * Gets repository counts by status
 */
export async function getRepositoryCounts() {
  const [total, pending, manual, auto, ignored, dirty] = await Promise.all([
    prisma.repository.count(),
    prisma.repository.count({ where: { triageStatus: 'pending' } }),
    prisma.repository.count({ where: { triageStatus: 'manual' } }),
    prisma.repository.count({ where: { triageStatus: 'auto' } }),
    prisma.repository.count({ where: { triageStatus: 'ignored' } }),
    prisma.repository.count({ where: { isDirty: true } }),
  ])

  return { total, pending, manual, auto, ignored, dirty }
}

/**
 * Assigns a theme to a repository
 */
export async function assignTheme(
  repoId: number,
  theme: string
): Promise<ActionResult> {
  try {
    const validation = assignThemeSchema.safeParse({ repoId, theme })

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid data",
      }
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
    })

    if (!repo) {
      return {
        success: false,
        error: "Repository not found",
      }
    }

    await prisma.repository.update({
      where: { id: repoId },
      data: {
        theme,
        triageStatus: 'manual',
      },
    })

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: undefined,
      message: `Theme "${theme}" assigned to ${repo.name}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign theme",
    }
  }
}

/**
 * Assigns a theme to multiple repositories
 */
export async function bulkAssignTheme(
  repoIds: number[],
  theme: string
): Promise<ActionResult> {
  try {
    const validation = bulkAssignThemeSchema.safeParse({ repoIds, theme })

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid data",
      }
    }

    await prisma.repository.updateMany({
      where: { id: { in: repoIds } },
      data: {
        theme,
        triageStatus: 'manual',
      },
    })

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: undefined,
      message: `Theme "${theme}" assigned to ${repoIds.length} repositories`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign themes",
    }
  }
}

/**
 * Sets a repository's triage status
 */
export async function setTriageStatus(
  repoId: number,
  status: TriageStatus
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

    await prisma.repository.update({
      where: { id: repoId },
      data: { triageStatus: status },
    })

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard/triage")

    return {
      success: true,
      data: undefined,
      message: `Status updated to "${status}"`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    }
  }
}

/**
 * Marks a repository as ignored
 */
export async function ignoreRepository(repoId: number): Promise<ActionResult> {
  return setTriageStatus(repoId, 'ignored')
}

/**
 * Deletes a repository record (does NOT delete files)
 */
export async function deleteRepositoryRecord(repoId: number): Promise<ActionResult> {
  try {
    await prisma.repository.delete({
      where: { id: repoId },
    })

    revalidatePath("/dashboard/repos")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: undefined,
      message: "Repository removed from database",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete repository",
    }
  }
}
