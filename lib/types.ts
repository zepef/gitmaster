import { z } from 'zod'

// ============================================
// Core Types
// ============================================

export type TriageStatus = 'pending' | 'manual' | 'auto' | 'ignored'

export interface RepoScanResult {
  name: string
  path: string
  remoteUrl: string | null
  lastCommitSha: string | null
  isDirty: boolean
}

export interface MovePreview {
  repoId: number
  repoName: string
  from: string
  to: string
  theme: string
  conflicts: string[]
  warnings: string[]
}

export interface MoveResult {
  success: boolean
  repoId: number
  repoName: string
  from: string
  to: string
  error?: string
}

export interface ScanResults {
  newRepos: number
  updatedRepos: number
  totalScanned: number
}

export interface SyncStatus {
  repoId: number
  localSha: string | null
  remoteSha: string | null
  status: 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown'
}

export type SyncStatusMap = Record<number, SyncStatus>

// ============================================
// Action Result Pattern
// ============================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

// ============================================
// System Path Detection
// ============================================

const SYSTEM_PATHS_WINDOWS = [
  'C:/Windows',
  'C:/Program Files',
  'C:/Program Files (x86)',
  'C:/ProgramData',
  'C:/Users/Default',
  'C:/Recovery',
  'C:/$Recycle.Bin',
  'C:/System Volume Information',
]

const SYSTEM_PATHS_UNIX = [
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/lib',
  '/lib64',
  '/opt',
  '/proc',
  '/root',
  '/sbin',
  '/sys',
  '/tmp',
  '/usr',
  '/var',
]

export function isSystemPath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()

  // Check Windows system paths
  for (const systemPath of SYSTEM_PATHS_WINDOWS) {
    if (normalizedPath.startsWith(systemPath.toLowerCase())) {
      return true
    }
  }

  // Check Unix system paths
  for (const systemPath of SYSTEM_PATHS_UNIX) {
    if (normalizedPath.startsWith(systemPath) || normalizedPath === systemPath) {
      return true
    }
  }

  return false
}

// ============================================
// Zod Schemas for Validation
// ============================================

export const settingsSchema = z.object({
  organizationRoot: z.string().min(3, 'Path must be at least 3 characters').refine(
    (p) => !isSystemPath(p),
    { message: 'Cannot use system directories' }
  ),
  autoTriageEnabled: z.boolean().optional(),
  backupDestination: z.string().optional(),
})

export const themeSchema = z.object({
  name: z.string()
    .min(1, 'Theme name is required')
    .max(50, 'Theme name must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Theme name must be lowercase alphanumeric with dashes only'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  description: z.string().max(200).optional(),
})

export const scanDirSchema = z.object({
  path: z.string().min(3, 'Path must be at least 3 characters').refine(
    (p) => !isSystemPath(p),
    { message: 'Cannot scan system directories' }
  ),
  isWsl: z.boolean(),
})

export const assignThemeSchema = z.object({
  repoId: z.number().int().positive(),
  theme: z.string().min(1),
})

export const bulkAssignThemeSchema = z.object({
  repoIds: z.array(z.number().int().positive()).min(1),
  theme: z.string().min(1),
})

// ============================================
// Default Themes
// ============================================

export const DEFAULT_THEMES = [
  { name: 'nextjs', color: '#000000', description: 'Next.js / React projects' },
  { name: 'python', color: '#3776AB', description: 'Python projects' },
  { name: 'experiments', color: '#FF6B6B', description: 'Experimental / learning projects' },
  { name: 'archived', color: '#6B7280', description: 'Deprecated / inactive projects' },
  { name: 'unclassified', color: '#9CA3AF', description: 'Fallback for repos without clear theme' },
] as const

// ============================================
// Move Options
// ============================================

export interface MoveOptions {
  createBackup: boolean
  handleConflicts: 'suffix' | 'skip' | 'fail'
}

export const DEFAULT_MOVE_OPTIONS: MoveOptions = {
  createBackup: false,
  handleConflicts: 'suffix',
}
