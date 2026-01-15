import * as path from 'path'

/**
 * Normalizes Windows paths by converting backslashes to forward slashes
 */
export function normalizeWindowsPath(inputPath: string): string {
  return inputPath.replace(/\\/g, '/')
}

/**
 * Normalizes WSL paths to Windows-accessible format
 * Converts /mnt/c/ to C:/ and handles \\wsl$\ paths
 */
export function normalizeWslPath(inputPath: string): string {
  // Handle /mnt/X/ format
  const mntMatch = inputPath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/)
  if (mntMatch) {
    const drive = mntMatch[1].toUpperCase()
    const restOfPath = mntMatch[2]
    return `${drive}:/${restOfPath}`
  }

  // Already in \\wsl$\ format or regular Windows path
  return normalizeWindowsPath(inputPath)
}

/**
 * Detects if a path is a WSL path
 */
export function isWslPath(inputPath: string): boolean {
  const normalized = inputPath.toLowerCase()

  // Check for \\wsl$\ or \\wsl.localhost\ format
  if (normalized.startsWith('\\\\wsl$\\') || normalized.startsWith('\\\\wsl.localhost\\')) {
    return true
  }

  // Check for /mnt/X/ format (WSL mount point)
  if (/^\/mnt\/[a-zA-Z]\//.test(inputPath)) {
    return true
  }

  // Check for Unix-style paths (likely WSL)
  if (inputPath.startsWith('/') && !inputPath.startsWith('//')) {
    return true
  }

  return false
}

/**
 * Joins path parts with forward slashes (cross-platform)
 */
export function joinPaths(...parts: string[]): string {
  return parts
    .map((part, index) => {
      // Remove trailing slashes except for the last part
      if (index < parts.length - 1) {
        return part.replace(/[/\\]+$/, '')
      }
      return part
    })
    .join('/')
    .replace(/[/\\]+/g, '/')
}

/**
 * Security check: ensures path is inside an allowed root directory
 * Prevents path traversal attacks
 */
export function isInsideAllowedRoot(targetPath: string, rootPath: string): boolean {
  const normalizedTarget = normalizeWindowsPath(path.resolve(targetPath)).toLowerCase()
  const normalizedRoot = normalizeWindowsPath(path.resolve(rootPath)).toLowerCase()

  return normalizedTarget.startsWith(normalizedRoot)
}

/**
 * Gets the drive letter from a Windows path
 */
export function getDriveLetter(inputPath: string): string | null {
  const normalized = normalizeWindowsPath(inputPath)
  const match = normalized.match(/^([A-Za-z]):/)
  return match ? match[1].toUpperCase() : null
}

/**
 * Checks if two paths are on the same drive
 */
export function isSameDrive(path1: string, path2: string): boolean {
  const drive1 = getDriveLetter(path1)
  const drive2 = getDriveLetter(path2)

  // If either path doesn't have a drive letter (Unix-style), assume different
  if (!drive1 || !drive2) return false

  return drive1 === drive2
}

/**
 * Extracts the repository name from a path
 */
export function getRepoNameFromPath(repoPath: string): string {
  const normalized = normalizeWindowsPath(repoPath)
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || 'unknown'
}

/**
 * Generates a conflict-free path by adding a numeric suffix if needed
 * e.g., my-repo -> my-repo-2 -> my-repo-3
 */
export function generateConflictFreePath(basePath: string, existingPaths: string[]): string {
  const normalizedBase = normalizeWindowsPath(basePath).toLowerCase()
  const normalizedExisting = existingPaths.map(p => normalizeWindowsPath(p).toLowerCase())

  if (!normalizedExisting.includes(normalizedBase)) {
    return basePath
  }

  let suffix = 2
  while (true) {
    const candidate = `${basePath}-${suffix}`
    if (!normalizedExisting.includes(normalizeWindowsPath(candidate).toLowerCase())) {
      return candidate
    }
    suffix++

    // Safety limit
    if (suffix > 100) {
      throw new Error('Too many path conflicts')
    }
  }
}

/**
 * Validates a path is safe for file operations
 */
export function isValidPath(inputPath: string): boolean {
  if (!inputPath || inputPath.length < 3) return false

  // Check for invalid characters (Windows)
  const invalidChars = /[<>:"|?*]/
  // Drive letter colon is allowed
  const pathWithoutDrive = inputPath.replace(/^[A-Za-z]:/, '')
  if (invalidChars.test(pathWithoutDrive)) return false

  // Check for path length (Windows MAX_PATH is 260)
  if (inputPath.length > 250) return false

  return true
}

/**
 * Gets the parent directory of a path
 */
export function getParentDirectory(inputPath: string): string {
  const normalized = normalizeWindowsPath(inputPath)
  const parts = normalized.split('/').filter(Boolean)

  if (parts.length <= 1) {
    // Root level
    return normalized.match(/^[A-Za-z]:/) ? parts[0] + ':/' : '/'
  }

  parts.pop()
  const result = parts.join('/')

  // Preserve drive letter format
  if (normalized.match(/^[A-Za-z]:/)) {
    return result || parts[0] + ':/'
  }

  return '/' + result
}
