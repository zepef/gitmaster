import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs/promises'
import * as path from 'path'
import { normalizeWindowsPath } from './path'

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
    const gitDir = path.join(dirPath, '.git')
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
  const queue: Array<{ path: string; depth: number }> = [{ path: directory, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.depth > maxDepth) continue

    try {
      const entries = await fs.readdir(current.path, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        // Skip hidden directories except .git
        if (entry.name.startsWith('.') && entry.name !== '.git') continue

        // Skip common non-project directories
        if (shouldSkipDirectory(entry.name)) continue

        const fullPath = path.join(current.path, entry.name)

        if (entry.name === '.git') {
          // Found a git repo - yield the parent directory
          yield current.path
          // Don't recurse into .git directories
          break
        } else {
          // Add to queue for further exploration
          queue.push({ path: fullPath, depth: current.depth + 1 })
        }
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
    '.git', // Will be handled separately
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
