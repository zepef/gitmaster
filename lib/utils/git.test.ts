import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseGitHubUrl, isGitHubRepo } from './git'

// Mock simple-git and fs for unit tests
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    getRemotes: vi.fn(),
    log: vi.fn(),
    status: vi.fn(),
    branchLocal: vi.fn(),
    raw: vi.fn(),
  })),
}))

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  readdir: vi.fn(),
}))

describe('parseGitHubUrl', () => {
  describe('HTTPS URLs', () => {
    it('parses standard HTTPS URL', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('parses HTTPS URL without .git extension', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('parses URL with hyphens and underscores', () => {
      const result = parseGitHubUrl('https://github.com/my-org/my_repo.git')
      expect(result).toEqual({ owner: 'my-org', repo: 'my_repo' })
    })

    it('parses URL with numbers', () => {
      const result = parseGitHubUrl('https://github.com/user123/repo456.git')
      expect(result).toEqual({ owner: 'user123', repo: 'repo456' })
    })
  })

  describe('SSH URLs', () => {
    it('parses standard SSH URL', () => {
      const result = parseGitHubUrl('git@github.com:owner/repo.git')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('parses SSH URL without .git extension', () => {
      const result = parseGitHubUrl('git@github.com:owner/repo')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('parses SSH URL with hyphens', () => {
      const result = parseGitHubUrl('git@github.com:my-org/my-repo.git')
      expect(result).toEqual({ owner: 'my-org', repo: 'my-repo' })
    })
  })

  describe('invalid URLs', () => {
    it('returns null for empty string', () => {
      expect(parseGitHubUrl('')).toBe(null)
    })

    it('returns null for non-GitHub URLs', () => {
      expect(parseGitHubUrl('https://gitlab.com/owner/repo.git')).toBe(null)
      expect(parseGitHubUrl('https://bitbucket.org/owner/repo.git')).toBe(null)
    })

    it('returns null for malformed URLs', () => {
      expect(parseGitHubUrl('not-a-url')).toBe(null)
      expect(parseGitHubUrl('github.com')).toBe(null)
    })
  })
})

describe('isGitHubRepo', () => {
  it('returns true for GitHub HTTPS URLs', () => {
    expect(isGitHubRepo('https://github.com/owner/repo.git')).toBe(true)
  })

  it('returns true for GitHub SSH URLs', () => {
    expect(isGitHubRepo('git@github.com:owner/repo.git')).toBe(true)
  })

  it('returns false for non-GitHub URLs', () => {
    expect(isGitHubRepo('https://gitlab.com/owner/repo.git')).toBe(false)
    expect(isGitHubRepo('https://bitbucket.org/owner/repo.git')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isGitHubRepo(null)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isGitHubRepo('')).toBe(false)
  })
})

// Integration-style tests that would require actual git repos
// These are skipped in unit tests but documented for integration testing
describe.skip('Git operations (integration tests)', () => {
  describe('isGitRepository', () => {
    it('returns true for valid git repository')
    it('returns false for non-git directory')
    it('returns false for non-existent directory')
  })

  describe('getRemoteUrl', () => {
    it('returns origin URL when available')
    it('returns first remote when origin not available')
    it('returns null when no remotes configured')
  })

  describe('getLastCommitSha', () => {
    it('returns SHA of latest commit')
    it('returns null for empty repository')
  })

  describe('isRepoDirty', () => {
    it('returns false for clean repository')
    it('returns true for modified files')
    it('returns true for staged files')
    it('returns true for untracked files')
  })

  describe('getCurrentBranch', () => {
    it('returns current branch name')
    it('returns null for detached HEAD')
  })

  describe('findGitRepos', () => {
    it('finds git repositories in directory')
    it('respects max depth')
    it('skips node_modules and other excluded directories')
    it('yields parent directory of .git folder')
  })
})
