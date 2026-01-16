import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs/promises'
import * as path from 'path'
import { normalizeWindowsPath, normalizeForFs } from './path'

/**
 * Gets the remote URL for a git repository
 */
export async function getRemoteUrl(repoPath: string): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit(repoPath)
    const remotes = await git.getRemotes(true)

    // Prefer 'origin' remote, fall back to first remote
    const origin = remotes.find(r => r.name === 'origin')
    const remote = origin || remotes[0]

    return remote?.refs?.fetch || remote?.refs?.push || null
  } catch {
    return null
  }
}

/**
 * Gets the last commit SHA for a repository
 */
export async function getLastCommitSha(repoPath: string): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit(repoPath)
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash || null
  } catch {
    return null
  }
}

/**
 * Checks if a repository has uncommitted changes
 */
export async function isRepoDirty(repoPath: string): Promise<boolean> {
  try {
    const git: SimpleGit = simpleGit(repoPath)
    const status = await git.status()

    // Check for any kind of changes
    return (
      status.modified.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.renamed.length > 0 ||
      status.not_added.length > 0 ||
      status.staged.length > 0
    )
  } catch {
    // If we can't check, assume dirty for safety
    return true
  }
}

/**
 * Gets the current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit(repoPath)
    const branch = await git.branchLocal()
    return branch.current || null
  } catch {
    return null
  }
}

/**
 * Checks if a directory is a git repository
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    // Normalize path for fs operations - critical for WSL UNC paths
    const normalizedPath = normalizeForFs(dirPath)
    const gitDir = path.join(normalizedPath, '.git').replace(/\\/g, '/')
    const stat = await fs.stat(gitDir)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Async generator that finds all git repositories within a directory
 * Uses breadth-first search and stops at .git directories (no nested repos)
 */
export async function* findGitRepos(
  directory: string,
  maxDepth: number = 5
): AsyncGenerator<string> {
  // Normalize path for fs operations - critical for WSL UNC paths
  const normalizedDir = normalizeForFs(directory)
  const queue: Array<{ path: string; depth: number }> = [{ path: normalizedDir, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.depth > maxDepth) continue

    try {
      const entries = await fs.readdir(current.path, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        // Check for .git directory FIRST - this indicates a git repo
        if (entry.name === '.git') {
          // Found a git repo - yield the parent directory
          yield current.path
          // Don't recurse into this repo (no nested repo search)
          break
        }

        // Skip hidden directories
        if (entry.name.startsWith('.')) continue

        // Skip common non-project directories
        if (shouldSkipDirectory(entry.name)) continue

        // Keep paths normalized with forward slashes for UNC path compatibility
        // Preserve leading // for UNC paths (like //wsl.localhost/...)
        let fullPath = current.path + '/' + entry.name
        // Remove duplicate slashes but preserve leading // for UNC paths
        const isUNC = fullPath.startsWith('//')
        fullPath = fullPath.replace(/\/+/g, '/')
        if (isUNC) fullPath = '/' + fullPath

        // Add to queue for further exploration
        queue.push({ path: fullPath, depth: current.depth + 1 })
      }
    } catch (error) {
      // Permission denied or other errors - skip this directory
      console.warn(`Warning: Could not read directory ${current.path}:`, error)
    }
  }
}

/**
 * Directories to skip during scanning for performance
 */
function shouldSkipDirectory(name: string): boolean {
  const skipDirs = new Set([
    'node_modules',
    'vendor',
    '.cache',
    '__pycache__',
    '.venv',
    'venv',
    'env',
    '.env',
    'dist',
    'build',
    'out',
    'target',
    '.next',
    '.nuxt',
    '.output',
    'coverage',
  ])

  return skipDirs.has(name)
}

/**
 * Gets comprehensive info about a git repository
 */
export interface GitRepoInfo {
  remoteUrl: string | null
  lastCommitSha: string | null
  currentBranch: string | null
  isDirty: boolean
}

export async function getRepoInfo(repoPath: string): Promise<GitRepoInfo> {
  const [remoteUrl, lastCommitSha, currentBranch, isDirty] = await Promise.all([
    getRemoteUrl(repoPath),
    getLastCommitSha(repoPath),
    getCurrentBranch(repoPath),
    isRepoDirty(repoPath),
  ])

  return {
    remoteUrl,
    lastCommitSha,
    currentBranch,
    isDirty,
  }
}

/**
 * Creates a git bundle (full backup) of a repository
 */
export async function createGitBundle(
  repoPath: string,
  outputPath: string
): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath)

  // Create bundle with all refs
  await git.raw(['bundle', 'create', outputPath, '--all'])
}

/**
 * Extracts owner and repo name from a GitHub URL
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null

  // Handle various GitHub URL formats
  const patterns = [
    // HTTPS: https://github.com/owner/repo.git
    /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/,
    // SSH: git@github.com:owner/repo.git
    /git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  }

  return null
}

/**
 * Checks if a remote URL is a GitHub repository
 */
export function isGitHubRepo(url: string | null): boolean {
  if (!url) return false
  return url.includes('github.com')
}

/**
 * Reads the README file from a repository
 * Tries common README filenames
 */
export async function getReadmeContent(repoPath: string): Promise<string | null> {
  const readmeNames = [
    'README.md',
    'readme.md',
    'README.MD',
    'Readme.md',
    'README',
    'readme',
    'README.txt',
    'readme.txt'
  ]

  const normalizedPath = normalizeForFs(repoPath)

  for (const readmeName of readmeNames) {
    try {
      const readmePath = `${normalizedPath}/${readmeName}`
      const content = await fs.readFile(readmePath, 'utf-8')
      // Limit to first 5000 characters to avoid processing huge files
      return content.slice(0, 5000)
    } catch {
      // File doesn't exist, try next
      continue
    }
  }

  return null
}

/**
 * Lists files in a repository root directory
 */
export async function listRepoFiles(repoPath: string): Promise<string[]> {
  try {
    const normalizedPath = normalizeForFs(repoPath)
    const entries = await fs.readdir(normalizedPath)
    return entries
  } catch {
    return []
  }
}

/**
 * Reads package.json from a repository if it exists
 */
export async function getPackageJson(repoPath: string): Promise<Record<string, unknown> | null> {
  try {
    const normalizedPath = normalizeForFs(repoPath)
    const content = await fs.readFile(`${normalizedPath}/package.json`, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
