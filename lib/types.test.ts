import { describe, it, expect } from 'vitest'
import {
  isSystemPath,
  settingsSchema,
  themeSchema,
  scanDirSchema,
  assignThemeSchema,
  bulkAssignThemeSchema,
  DEFAULT_THEMES,
  DEFAULT_MOVE_OPTIONS,
} from './types'

describe('isSystemPath', () => {
  describe('Windows system paths', () => {
    it('detects C:/Windows', () => {
      expect(isSystemPath('C:/Windows')).toBe(true)
      expect(isSystemPath('C:\\Windows')).toBe(true)
      expect(isSystemPath('c:/windows/system32')).toBe(true)
    })

    it('detects Program Files', () => {
      expect(isSystemPath('C:/Program Files')).toBe(true)
      expect(isSystemPath('C:/Program Files (x86)')).toBe(true)
      expect(isSystemPath('C:/Program Files/Microsoft')).toBe(true)
    })

    it('detects ProgramData', () => {
      expect(isSystemPath('C:/ProgramData')).toBe(true)
    })

    it('detects system recovery paths', () => {
      expect(isSystemPath('C:/Recovery')).toBe(true)
      expect(isSystemPath('C:/$Recycle.Bin')).toBe(true)
      expect(isSystemPath('C:/System Volume Information')).toBe(true)
    })
  })

  describe('Unix system paths', () => {
    it('detects /bin, /sbin, /lib', () => {
      expect(isSystemPath('/bin')).toBe(true)
      expect(isSystemPath('/sbin')).toBe(true)
      expect(isSystemPath('/lib')).toBe(true)
      expect(isSystemPath('/lib64')).toBe(true)
    })

    it('detects /etc, /usr, /var', () => {
      expect(isSystemPath('/etc')).toBe(true)
      expect(isSystemPath('/usr')).toBe(true)
      expect(isSystemPath('/var')).toBe(true)
      expect(isSystemPath('/usr/local/bin')).toBe(true)
    })

    it('detects /boot, /dev, /proc, /sys', () => {
      expect(isSystemPath('/boot')).toBe(true)
      expect(isSystemPath('/dev')).toBe(true)
      expect(isSystemPath('/proc')).toBe(true)
      expect(isSystemPath('/sys')).toBe(true)
    })

    it('detects /root and /tmp', () => {
      expect(isSystemPath('/root')).toBe(true)
      expect(isSystemPath('/tmp')).toBe(true)
    })
  })

  describe('safe paths', () => {
    it('returns false for user directories', () => {
      expect(isSystemPath('C:/Users/test/Projects')).toBe(false)
      expect(isSystemPath('D:/Development')).toBe(false)
      expect(isSystemPath('E:/Code')).toBe(false)
    })

    it('returns false for Unix home directories', () => {
      expect(isSystemPath('/home/user')).toBe(false)
      expect(isSystemPath('/home/user/projects')).toBe(false)
    })

    it('returns false for /mnt paths', () => {
      expect(isSystemPath('/mnt/c/Users')).toBe(false)
    })
  })
})

describe('settingsSchema', () => {
  it('validates valid organization root', () => {
    const result = settingsSchema.safeParse({
      organizationRoot: 'D:/Codebase/organized',
    })
    expect(result.success).toBe(true)
  })

  it('rejects paths that are too short', () => {
    const result = settingsSchema.safeParse({
      organizationRoot: 'C:',
    })
    expect(result.success).toBe(false)
  })

  it('rejects system paths', () => {
    const result = settingsSchema.safeParse({
      organizationRoot: 'C:/Windows/Temp',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('system directories')
    }
  })

  it('accepts optional autoTriageEnabled', () => {
    const result = settingsSchema.safeParse({
      organizationRoot: 'D:/Code',
      autoTriageEnabled: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('themeSchema', () => {
  it('validates valid theme', () => {
    const result = themeSchema.safeParse({
      name: 'my-theme',
      color: '#FF5500',
      description: 'A custom theme',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = themeSchema.safeParse({
      color: '#FF5500',
    })
    expect(result.success).toBe(false)
  })

  it('enforces lowercase alphanumeric with dashes', () => {
    expect(themeSchema.safeParse({ name: 'my-theme' }).success).toBe(true)
    expect(themeSchema.safeParse({ name: 'theme123' }).success).toBe(true)
    expect(themeSchema.safeParse({ name: 'My-Theme' }).success).toBe(false)
    expect(themeSchema.safeParse({ name: 'my_theme' }).success).toBe(false)
    expect(themeSchema.safeParse({ name: 'my theme' }).success).toBe(false)
  })

  it('validates hex color format', () => {
    expect(themeSchema.safeParse({ name: 'test', color: '#FFFFFF' }).success).toBe(true)
    expect(themeSchema.safeParse({ name: 'test', color: '#000000' }).success).toBe(true)
    expect(themeSchema.safeParse({ name: 'test', color: '#ff5500' }).success).toBe(true)
    expect(themeSchema.safeParse({ name: 'test', color: 'red' }).success).toBe(false)
    expect(themeSchema.safeParse({ name: 'test', color: '#FFF' }).success).toBe(false)
  })

  it('limits name length to 50 characters', () => {
    const longName = 'a'.repeat(51)
    expect(themeSchema.safeParse({ name: longName }).success).toBe(false)
  })

  it('limits description length to 200 characters', () => {
    const longDesc = 'a'.repeat(201)
    expect(themeSchema.safeParse({ name: 'test', description: longDesc }).success).toBe(false)
  })
})

describe('scanDirSchema', () => {
  it('validates valid scan directory', () => {
    const result = scanDirSchema.safeParse({
      path: 'D:/Projects',
      isWsl: false,
    })
    expect(result.success).toBe(true)
  })

  it('validates WSL directory', () => {
    const result = scanDirSchema.safeParse({
      path: '/home/user/projects',
      isWsl: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects system directories', () => {
    const result = scanDirSchema.safeParse({
      path: 'C:/Windows',
      isWsl: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects paths that are too short', () => {
    const result = scanDirSchema.safeParse({
      path: 'C:',
      isWsl: false,
    })
    expect(result.success).toBe(false)
  })
})

describe('assignThemeSchema', () => {
  it('validates valid assignment', () => {
    const result = assignThemeSchema.safeParse({
      repoId: 1,
      theme: 'nextjs',
    })
    expect(result.success).toBe(true)
  })

  it('requires positive integer for repoId', () => {
    expect(assignThemeSchema.safeParse({ repoId: 0, theme: 'test' }).success).toBe(false)
    expect(assignThemeSchema.safeParse({ repoId: -1, theme: 'test' }).success).toBe(false)
    expect(assignThemeSchema.safeParse({ repoId: 1.5, theme: 'test' }).success).toBe(false)
  })

  it('requires non-empty theme', () => {
    const result = assignThemeSchema.safeParse({
      repoId: 1,
      theme: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('bulkAssignThemeSchema', () => {
  it('validates valid bulk assignment', () => {
    const result = bulkAssignThemeSchema.safeParse({
      repoIds: [1, 2, 3],
      theme: 'python',
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one repoId', () => {
    const result = bulkAssignThemeSchema.safeParse({
      repoIds: [],
      theme: 'python',
    })
    expect(result.success).toBe(false)
  })

  it('requires all repoIds to be positive integers', () => {
    expect(bulkAssignThemeSchema.safeParse({ repoIds: [1, 0], theme: 'test' }).success).toBe(false)
    expect(bulkAssignThemeSchema.safeParse({ repoIds: [1, -1], theme: 'test' }).success).toBe(false)
  })
})

describe('DEFAULT_THEMES', () => {
  it('contains expected themes', () => {
    const themeNames = DEFAULT_THEMES.map(t => t.name)
    expect(themeNames).toContain('nextjs')
    expect(themeNames).toContain('python')
    expect(themeNames).toContain('experiments')
    expect(themeNames).toContain('archived')
    expect(themeNames).toContain('unclassified')
  })

  it('all themes have valid colors', () => {
    for (const theme of DEFAULT_THEMES) {
      expect(theme.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('all themes have descriptions', () => {
    for (const theme of DEFAULT_THEMES) {
      expect(theme.description).toBeTruthy()
    }
  })
})

describe('DEFAULT_MOVE_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_MOVE_OPTIONS.createBackup).toBe(false)
    expect(DEFAULT_MOVE_OPTIONS.handleConflicts).toBe('suffix')
  })
})
