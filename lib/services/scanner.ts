import { findGitRepos, getRepoInfo, getReadmeContent, listRepoFiles, getPackageJson } from "@/lib/utils/git"
import { getRepoNameFromPath, normalizeWindowsPath } from "@/lib/utils/path"
import { RepoScanResult } from "@/lib/types"
import { updateScanProgress, isScanCancelled } from "@/lib/services/scan-progress"

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
      // Check for cancellation
      if (isScanCancelled()) {
        console.log(`Scan cancelled for ${dirPath}`)
        break
      }

      // Check timeout
      if (Date.now() - startTime > SCAN_TIMEOUT_MS) {
        console.warn(`Scan timeout reached for ${dirPath}`)
        break
      }

      try {
        const info = await getRepoInfo(repoPath)
        const name = getRepoNameFromPath(repoPath)

        // Gather data for theme suggestion
        const [readmeContent, files, packageJson] = await Promise.all([
          getReadmeContent(repoPath),
          listRepoFiles(repoPath),
          getPackageJson(repoPath),
        ])

        const suggestedTheme = suggestTheme({
          packageJson: packageJson as ThemeSuggestionInput['packageJson'],
          files,
          remoteUrl: info.remoteUrl,
          readmeContent,
          repoDescription: null, // Could be fetched from GitHub API in the future
        })

        results.push({
          name,
          path: normalizeWindowsPath(repoPath),
          remoteUrl: info.remoteUrl,
          lastCommitSha: info.lastCommitSha,
          isDirty: info.isDirty,
          suggestedTheme,
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
 * Scans multiple directories with progress reporting via the scan-progress module
 * This version integrates with the centralized progress tracking system
 */
export async function scanDirectoriesWithProgress(
  directories: Array<{ path: string; enabled: boolean }>
): Promise<RepoScanResult[]> {
  const enabledDirs = directories.filter((d) => d.enabled)
  const allResults: RepoScanResult[] = []

  for (let i = 0; i < enabledDirs.length; i++) {
    // Check for cancellation before each directory
    if (isScanCancelled()) {
      console.log('Scan cancelled, stopping directory iteration')
      break
    }

    const dir = enabledDirs[i]

    // Update centralized progress state
    updateScanProgress({
      currentDirectory: dir.path,
      currentDirectoryIndex: i + 1,
      reposFound: allResults.length,
    })

    const results = await scanDirectory(dir.path)
    allResults.push(...results)
  }

  // Deduplicate by path
  const uniqueResults = deduplicateByPath(allResults)

  // Final progress update with total repos found
  updateScanProgress({
    reposFound: uniqueResults.length,
  })

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
  readmeContent?: string | null
  repoDescription?: string | null
}

// Keywords for theme detection from README/description
const THEME_KEYWORDS: Record<string, string[]> = {
  nextjs: [
    'next.js', 'nextjs', 'react', 'typescript', 'tailwind', 'vercel',
    'frontend', 'web app', 'dashboard', 'ui', 'component'
  ],
  python: [
    'python', 'django', 'flask', 'fastapi', 'pytorch', 'tensorflow',
    'machine learning', 'ml', 'ai', 'data science', 'pandas', 'numpy',
    'jupyter', 'notebook', 'pip', 'conda'
  ],
  experiments: [
    'experiment', 'poc', 'proof of concept', 'prototype', 'demo',
    'learning', 'tutorial', 'playground', 'sandbox', 'test', 'example'
  ],
  archived: [
    'archived', 'deprecated', 'legacy', 'old', 'unmaintained',
    'no longer maintained', 'obsolete', 'inactive'
  ]
}

export function suggestTheme(input: ThemeSuggestionInput): string {
  const { packageJson, files = [], remoteUrl, readmeContent, repoDescription } = input

  // Combine README and description for text analysis
  const textContent = [
    readmeContent || '',
    repoDescription || ''
  ].join(' ').toLowerCase()

  // Check for archived indicators first (highest priority)
  if (
    remoteUrl?.includes('archived') ||
    remoteUrl?.includes('deprecated') ||
    THEME_KEYWORDS.archived.some(kw => textContent.includes(kw))
  ) {
    return 'archived'
  }

  // Check for Next.js / React from package.json
  if (packageJson?.dependencies?.next || packageJson?.devDependencies?.next) {
    return 'nextjs'
  }

  // Check for React (without Next.js)
  if (
    packageJson?.dependencies?.react &&
    !packageJson?.dependencies?.next &&
    !packageJson?.devDependencies?.next
  ) {
    return 'nextjs' // Group React with Next.js theme
  }

  // Check for Python projects from files
  const pythonIndicators = ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile']
  if (files.some((f) => pythonIndicators.includes(f)) || files.some((f) => f.endsWith('.py'))) {
    return 'python'
  }

  // Check for Vue
  if (packageJson?.dependencies?.vue) {
    return 'experiments'
  }

  // Analyze README/description for keywords
  if (textContent.length > 0) {
    // Count keyword matches for each theme
    const scores: Record<string, number> = {}

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      scores[theme] = keywords.filter(kw => textContent.includes(kw)).length
    }

    // Find the theme with the highest score
    const bestTheme = Object.entries(scores)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])[0]

    if (bestTheme && bestTheme[1] >= 2) {
      return bestTheme[0]
    }
  }

  // Default
  return 'unclassified'
}
