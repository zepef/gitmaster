import { describe, it, expect } from 'vitest'
import {
  normalizeWindowsPath,
  normalizeWslPath,
  isWslPath,
  joinPaths,
  isInsideAllowedRoot,
  getDriveLetter,
  isSameDrive,
  getRepoNameFromPath,
  generateConflictFreePath,
  isValidPath,
  getParentDirectory,
} from './path'

describe('normalizeWindowsPath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizeWindowsPath('C:\\Users\\test\\project')).toBe('C:/Users/test/project')
  })

  it('handles paths with mixed slashes', () => {
    expect(normalizeWindowsPath('C:\\Users/test\\project')).toBe('C:/Users/test/project')
  })

  it('handles paths already using forward slashes', () => {
    expect(normalizeWindowsPath('C:/Users/test/project')).toBe('C:/Users/test/project')
  })

  it('handles empty string', () => {
    expect(normalizeWindowsPath('')).toBe('')
  })
})

describe('normalizeWslPath', () => {
  it('converts /mnt/c/ paths to Windows format', () => {
    expect(normalizeWslPath('/mnt/c/Users/test')).toBe('C:/Users/test')
  })

  it('converts /mnt/d/ paths to Windows format', () => {
    expect(normalizeWslPath('/mnt/d/Projects/app')).toBe('D:/Projects/app')
  })

  it('handles lowercase drive letters', () => {
    expect(normalizeWslPath('/mnt/e/code')).toBe('E:/code')
  })

  it('passes through regular Windows paths', () => {
    expect(normalizeWslPath('D:\\Projects\\app')).toBe('D:/Projects/app')
  })

  it('passes through paths already in Windows format', () => {
    expect(normalizeWslPath('C:/Users/test')).toBe('C:/Users/test')
  })
})

describe('isWslPath', () => {
  it('detects /mnt/x/ format paths', () => {
    expect(isWslPath('/mnt/c/Users/test')).toBe(true)
    expect(isWslPath('/mnt/d/Projects')).toBe(true)
  })

  it('detects \\\\wsl$\\ format paths', () => {
    expect(isWslPath('\\\\wsl$\\Ubuntu\\home\\user')).toBe(true)
  })

  it('detects \\\\wsl.localhost\\ format paths', () => {
    expect(isWslPath('\\\\wsl.localhost\\Ubuntu\\home')).toBe(true)
  })

  it('detects Unix-style paths', () => {
    expect(isWslPath('/home/user/project')).toBe(true)
  })

  it('returns false for Windows paths', () => {
    expect(isWslPath('C:\\Users\\test')).toBe(false)
    expect(isWslPath('D:/Projects/app')).toBe(false)
  })

  it('returns false for UNC paths', () => {
    expect(isWslPath('//server/share')).toBe(false)
  })
})

describe('joinPaths', () => {
  it('joins path parts with forward slashes', () => {
    expect(joinPaths('C:/Users', 'test', 'project')).toBe('C:/Users/test/project')
  })

  it('removes trailing slashes from intermediate parts', () => {
    expect(joinPaths('C:/Users/', 'test/', 'project')).toBe('C:/Users/test/project')
  })

  it('normalizes multiple slashes', () => {
    expect(joinPaths('C://Users', 'test//dir', 'project')).toBe('C:/Users/test/dir/project')
  })

  it('handles single part', () => {
    expect(joinPaths('C:/Users')).toBe('C:/Users')
  })

  it('handles backslashes in input', () => {
    expect(joinPaths('C:\\Users', 'test')).toBe('C:/Users/test')
  })
})

describe('isInsideAllowedRoot', () => {
  it('returns true when target is inside root', () => {
    expect(isInsideAllowedRoot('C:/Projects/app', 'C:/Projects')).toBe(true)
  })

  it('returns true when target equals root', () => {
    expect(isInsideAllowedRoot('C:/Projects', 'C:/Projects')).toBe(true)
  })

  it('returns false when target is outside root', () => {
    expect(isInsideAllowedRoot('D:/Other/app', 'C:/Projects')).toBe(false)
  })

  it('handles path traversal attempts', () => {
    expect(isInsideAllowedRoot('C:/Projects/../Other', 'C:/Projects')).toBe(false)
  })

  it('is case-insensitive on Windows', () => {
    expect(isInsideAllowedRoot('c:/projects/app', 'C:/Projects')).toBe(true)
  })
})

describe('getDriveLetter', () => {
  it('extracts drive letter from Windows path', () => {
    expect(getDriveLetter('C:/Users/test')).toBe('C')
    expect(getDriveLetter('D:\\Projects')).toBe('D')
  })

  it('returns uppercase drive letter', () => {
    expect(getDriveLetter('c:/users')).toBe('C')
  })

  it('returns null for paths without drive letter', () => {
    expect(getDriveLetter('/home/user')).toBe(null)
    expect(getDriveLetter('relative/path')).toBe(null)
  })
})

describe('isSameDrive', () => {
  it('returns true for paths on same drive', () => {
    expect(isSameDrive('C:/Users/test', 'C:/Projects/app')).toBe(true)
  })

  it('returns true regardless of case', () => {
    expect(isSameDrive('c:/users', 'C:/projects')).toBe(true)
  })

  it('returns false for paths on different drives', () => {
    expect(isSameDrive('C:/Users', 'D:/Projects')).toBe(false)
  })

  it('returns false when either path lacks drive letter', () => {
    expect(isSameDrive('/home/user', 'C:/Users')).toBe(false)
    expect(isSameDrive('C:/Users', '/mnt/c/Users')).toBe(false)
  })
})

describe('getRepoNameFromPath', () => {
  it('extracts folder name from path', () => {
    expect(getRepoNameFromPath('C:/Projects/my-app')).toBe('my-app')
  })

  it('handles paths with trailing slash', () => {
    expect(getRepoNameFromPath('C:/Projects/my-app/')).toBe('my-app')
  })

  it('handles Windows backslashes', () => {
    expect(getRepoNameFromPath('C:\\Projects\\my-app')).toBe('my-app')
  })

  it('returns "unknown" for empty or root paths', () => {
    expect(getRepoNameFromPath('')).toBe('unknown')
  })
})

describe('generateConflictFreePath', () => {
  it('returns original path when no conflict', () => {
    const existing = ['C:/Projects/other-app']
    expect(generateConflictFreePath('C:/Projects/my-app', existing)).toBe('C:/Projects/my-app')
  })

  it('adds suffix when path exists', () => {
    const existing = ['c:/projects/my-app']
    expect(generateConflictFreePath('C:/Projects/my-app', existing)).toBe('C:/Projects/my-app-2')
  })

  it('increments suffix until unique', () => {
    const existing = [
      'c:/projects/my-app',
      'c:/projects/my-app-2',
      'c:/projects/my-app-3',
    ]
    expect(generateConflictFreePath('C:/Projects/my-app', existing)).toBe('C:/Projects/my-app-4')
  })

  it('is case-insensitive', () => {
    const existing = ['C:/PROJECTS/MY-APP']
    expect(generateConflictFreePath('c:/projects/my-app', existing)).toBe('c:/projects/my-app-2')
  })

  it('throws when too many conflicts', () => {
    const existing = Array.from({ length: 101 }, (_, i) =>
      i === 0 ? 'c:/projects/app' : `c:/projects/app-${i + 1}`
    )
    expect(() => generateConflictFreePath('C:/Projects/app', existing)).toThrow('Too many path conflicts')
  })
})

describe('isValidPath', () => {
  it('returns true for valid Windows paths', () => {
    expect(isValidPath('C:/Users/test')).toBe(true)
    expect(isValidPath('D:\\Projects\\app')).toBe(true)
  })

  it('returns false for paths with invalid characters', () => {
    expect(isValidPath('C:/Users/<test>')).toBe(false)
    expect(isValidPath('C:/Users/test?')).toBe(false)
    expect(isValidPath('C:/Users/test*')).toBe(false)
    expect(isValidPath('C:/Users/"test"')).toBe(false)
  })

  it('allows colon in drive letter position', () => {
    expect(isValidPath('C:/valid/path')).toBe(true)
  })

  it('returns false for paths that are too short', () => {
    expect(isValidPath('C:')).toBe(false)
    expect(isValidPath('')).toBe(false)
  })

  it('returns false for paths that are too long', () => {
    const longPath = 'C:/' + 'a'.repeat(250)
    expect(isValidPath(longPath)).toBe(false)
  })
})

describe('getParentDirectory', () => {
  it('returns parent directory for nested path', () => {
    expect(getParentDirectory('C:/Users/test/project')).toBe('C:/Users/test')
  })

  it('handles Windows backslashes', () => {
    expect(getParentDirectory('C:\\Users\\test\\project')).toBe('C:/Users/test')
  })

  it('returns drive root for top-level folder', () => {
    expect(getParentDirectory('C:/Users')).toBe('C:/')
  })

  it('handles paths with trailing slash', () => {
    expect(getParentDirectory('C:/Users/test/')).toBe('C:/Users')
  })

  it('returns root for Unix paths', () => {
    expect(getParentDirectory('/home/user')).toBe('/home')
  })
})
