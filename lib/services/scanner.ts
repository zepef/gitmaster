import { findGitRepos, getRepoInfo } from "@/lib/utils/git"
import { getRepoNameFromPath, normalizeWindowsPath } from "@/lib/utils/path"
import { RepoScanResult } from "@/lib/types"

const SCAN_TIMEOUT_MS = 60000 // 1 minute max per directory

/**
 * Scans a single directory for git repositories
 */
export async function scanDirectory(
  dirPath: string,
  maxDepth: number = 5
): Promise<RepoScanResult[]> {
  const results: RepoScanResult[] = []

  try {
    const startTime = Date.now()

    for await (const repoPath of findGitRepos(dirPath, maxDepth)) {
      // Check timeout
      if (Date.now() - startTime > SCAN_TIMEOUT_MS) {
        console.warn(`Scan timeout reached for ${dirPath}`)
        break
      }

      try {
        const info = await getRepoInfo(repoPath)
        const name = getRepoNameFromPath(repoPath)

        results.push({
          name,
          path: normalizeWindowsPath(repoPath),
          remoteUrl: info.remoteUrl,
          lastCommitSha: info.lastCommitSha,
          isDirty: info.isDirty,
        })
      } catch (error) {
        console.warn(`Could not get info for repo at ${repoPath}:`, error)
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return results
}

/**
 * Scans multiple directories for git repositories
 */
export async function scanDirectories(
  directories: Array<{ path: string; enabled: boolean }>,
  onProgress?: (current: number, total: number, currentDir: string) => void
): Promise<RepoScanResult[]> {
  const enabledDirs = directories.filter((d) => d.enabled)
  const allResults: RepoScanResult[] = []

  for (let i = 0; i < enabledDirs.length; i++) {
    const dir = enabledDirs[i]

    onProgress?.(i + 1, enabledDirs.length, dir.path)

    const results = await scanDirectory(dir.path)
    allResults.push(...results)
  }

  // Deduplicate by path
  const uniqueResults = deduplicateByPath(allResults)

  return uniqueResults
}

/**
 * Deduplicates scan results by path
 */
function deduplicateByPath(results: RepoScanResult[]): RepoScanResult[] {
  const seen = new Map<string, RepoScanResult>()

  for (const result of results) {
    const normalizedPath = normalizeWindowsPath(result.path).toLowerCase()

    if (!seen.has(normalizedPath)) {
      seen.set(normalizedPath, result)
    }
  }

  return Array.from(seen.values())
}

/**
 * Suggests a theme based on repository contents
 */
export interface ThemeSuggestionInput {
  packageJson?: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  files?: string[]
  remoteUrl?: string | null
}

export function suggestTheme(input: ThemeSuggestionInput): string {
  const { packageJson, files = [], remoteUrl } = input

  // Check for Next.js
  if (packageJson?.dependencies?.next || packageJson?.devDependencies?.next) {
    return 'nextjs'
  }

  // Check for Python projects
  const pythonIndicators = ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile']
  if (files.some((f) => pythonIndicators.includes(f)) || files.some((f) => f.endsWith('.py'))) {
    return 'python'
  }

  // Check for React (without Next.js)
  if (
    packageJson?.dependencies?.react &&
    !packageJson?.dependencies?.next &&
    !packageJson?.devDependencies?.next
  ) {
    return 'nextjs' // Group React with Next.js theme
  }

  // Check for Vue
  if (packageJson?.dependencies?.vue) {
    return 'experiments' // Could add a vue theme later
  }

  // Check for archived indicators in URL
  if (remoteUrl?.includes('archived') || remoteUrl?.includes('deprecated')) {
    return 'archived'
  }

  // Default
  return 'unclassified'
}
