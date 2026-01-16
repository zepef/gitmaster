import { describe, it, expect } from 'vitest'
import { suggestTheme } from './scanner'

describe('suggestTheme', () => {
  describe('Next.js detection', () => {
    it('detects Next.js from dependencies', () => {
      const result = suggestTheme({
        packageJson: {
          dependencies: { next: '^14.0.0' },
        },
      })
      expect(result).toBe('nextjs')
    })

    it('detects Next.js from devDependencies', () => {
      const result = suggestTheme({
        packageJson: {
          devDependencies: { next: '^14.0.0' },
        },
      })
      expect(result).toBe('nextjs')
    })
  })

  describe('React detection', () => {
    it('groups React (without Next.js) under nextjs theme', () => {
      const result = suggestTheme({
        packageJson: {
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        },
      })
      expect(result).toBe('nextjs')
    })

    it('prefers Next.js when both React and Next.js present', () => {
      const result = suggestTheme({
        packageJson: {
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
        },
      })
      expect(result).toBe('nextjs')
    })
  })

  describe('Python detection', () => {
    it('detects Python from requirements.txt', () => {
      const result = suggestTheme({
        files: ['requirements.txt', 'main.py'],
      })
      expect(result).toBe('python')
    })

    it('detects Python from setup.py', () => {
      const result = suggestTheme({
        files: ['setup.py'],
      })
      expect(result).toBe('python')
    })

    it('detects Python from pyproject.toml', () => {
      const result = suggestTheme({
        files: ['pyproject.toml'],
      })
      expect(result).toBe('python')
    })

    it('detects Python from Pipfile', () => {
      const result = suggestTheme({
        files: ['Pipfile'],
      })
      expect(result).toBe('python')
    })

    it('detects Python from .py files', () => {
      const result = suggestTheme({
        files: ['main.py', 'utils.py'],
      })
      expect(result).toBe('python')
    })
  })

  describe('Vue detection', () => {
    it('detects Vue and suggests experiments theme', () => {
      const result = suggestTheme({
        packageJson: {
          dependencies: { vue: '^3.0.0' },
        },
      })
      expect(result).toBe('experiments')
    })
  })

  describe('archived detection', () => {
    it('detects archived from URL containing "archived"', () => {
      const result = suggestTheme({
        remoteUrl: 'https://github.com/user/archived-project.git',
      })
      expect(result).toBe('archived')
    })

    it('detects archived from URL containing "deprecated"', () => {
      const result = suggestTheme({
        remoteUrl: 'https://github.com/user/deprecated-lib.git',
      })
      expect(result).toBe('archived')
    })
  })

  describe('default fallback', () => {
    it('returns unclassified for empty input', () => {
      const result = suggestTheme({})
      expect(result).toBe('unclassified')
    })

    it('returns unclassified for unknown project type', () => {
      const result = suggestTheme({
        files: ['README.md', 'LICENSE'],
        packageJson: {
          dependencies: { lodash: '^4.0.0' },
        },
      })
      expect(result).toBe('unclassified')
    })

    it('returns unclassified when no indicators present', () => {
      const result = suggestTheme({
        files: [],
        packageJson: {},
        remoteUrl: 'https://github.com/user/mystery.git',
      })
      expect(result).toBe('unclassified')
    })
  })

  describe('priority order', () => {
    it('prioritizes Next.js over Python when both present', () => {
      const result = suggestTheme({
        packageJson: {
          dependencies: { next: '^14.0.0' },
        },
        files: ['requirements.txt'],
      })
      expect(result).toBe('nextjs')
    })

    it('prioritizes archived status over technology type', () => {
      // Archived status takes priority since it indicates lifecycle status
      const result = suggestTheme({
        files: ['setup.py'],
        remoteUrl: 'https://github.com/user/archived-python.git',
      })
      expect(result).toBe('archived')
    })
  })

  describe('README-based detection', () => {
    it('detects Python from README content', () => {
      const result = suggestTheme({
        readmeContent: 'This is a machine learning project using PyTorch and pandas for data science.',
      })
      expect(result).toBe('python')
    })

    it('detects experiments from README content', () => {
      const result = suggestTheme({
        readmeContent: 'This is a proof of concept prototype for learning React.',
      })
      expect(result).toBe('experiments')
    })

    it('detects archived from README content', () => {
      const result = suggestTheme({
        readmeContent: 'This project is deprecated and no longer maintained.',
      })
      expect(result).toBe('archived')
    })

    it('detects nextjs from README content', () => {
      const result = suggestTheme({
        readmeContent: 'A modern web app dashboard built with Next.js and Tailwind CSS.',
      })
      expect(result).toBe('nextjs')
    })

    it('requires at least 2 keyword matches for README detection', () => {
      // Single keyword match should not be enough
      const result = suggestTheme({
        readmeContent: 'A project about something with react.',
      })
      expect(result).toBe('unclassified')
    })

    it('uses repo description for detection', () => {
      const result = suggestTheme({
        repoDescription: 'A FastAPI backend with pandas data processing',
      })
      expect(result).toBe('python')
    })
  })
})
