import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getScanProgress,
  startScan,
  updateScanProgress,
  completeScan,
  failScan,
  resetScan,
  isScanInProgress,
  subscribeToProgress,
  type ScanProgress,
} from './scan-progress'

describe('scan-progress', () => {
  // Reset state before each test
  beforeEach(() => {
    resetScan()
  })

  describe('getScanProgress', () => {
    it('returns initial idle state', () => {
      const progress = getScanProgress()
      expect(progress.status).toBe('idle')
      expect(progress.currentDirectory).toBe('')
      expect(progress.currentDirectoryIndex).toBe(0)
      expect(progress.totalDirectories).toBe(0)
      expect(progress.reposFound).toBe(0)
      expect(progress.startedAt).toBeNull()
      expect(progress.completedAt).toBeNull()
      expect(progress.error).toBeNull()
    })

    it('returns a copy of state, not the original reference', () => {
      const progress1 = getScanProgress()
      const progress2 = getScanProgress()
      expect(progress1).not.toBe(progress2)
      expect(progress1).toEqual(progress2)
    })
  })

  describe('startScan', () => {
    it('sets status to scanning', () => {
      startScan(5)
      const progress = getScanProgress()
      expect(progress.status).toBe('scanning')
    })

    it('sets totalDirectories', () => {
      startScan(10)
      const progress = getScanProgress()
      expect(progress.totalDirectories).toBe(10)
    })

    it('sets startedAt to current time', () => {
      const before = Date.now()
      startScan(5)
      const after = Date.now()
      const progress = getScanProgress()
      expect(progress.startedAt).toBeGreaterThanOrEqual(before)
      expect(progress.startedAt).toBeLessThanOrEqual(after)
    })

    it('resets other fields', () => {
      // Set some state first
      startScan(5)
      updateScanProgress({ currentDirectory: '/test', reposFound: 10 })
      completeScan(10)

      // Start a new scan
      startScan(3)
      const progress = getScanProgress()
      expect(progress.currentDirectory).toBe('')
      expect(progress.currentDirectoryIndex).toBe(0)
      expect(progress.reposFound).toBe(0)
      expect(progress.completedAt).toBeNull()
      expect(progress.error).toBeNull()
    })
  })

  describe('updateScanProgress', () => {
    beforeEach(() => {
      startScan(5)
    })

    it('updates currentDirectory', () => {
      updateScanProgress({ currentDirectory: '/path/to/dir' })
      const progress = getScanProgress()
      expect(progress.currentDirectory).toBe('/path/to/dir')
    })

    it('updates currentDirectoryIndex', () => {
      updateScanProgress({ currentDirectoryIndex: 3 })
      const progress = getScanProgress()
      expect(progress.currentDirectoryIndex).toBe(3)
    })

    it('updates reposFound', () => {
      updateScanProgress({ reposFound: 15 })
      const progress = getScanProgress()
      expect(progress.reposFound).toBe(15)
    })

    it('updates multiple fields at once', () => {
      updateScanProgress({
        currentDirectory: '/test',
        currentDirectoryIndex: 2,
        reposFound: 5,
      })
      const progress = getScanProgress()
      expect(progress.currentDirectory).toBe('/test')
      expect(progress.currentDirectoryIndex).toBe(2)
      expect(progress.reposFound).toBe(5)
    })

    it('preserves fields not being updated', () => {
      updateScanProgress({ currentDirectory: '/first' })
      updateScanProgress({ reposFound: 10 })
      const progress = getScanProgress()
      expect(progress.currentDirectory).toBe('/first')
      expect(progress.reposFound).toBe(10)
      expect(progress.status).toBe('scanning')
      expect(progress.totalDirectories).toBe(5)
    })
  })

  describe('completeScan', () => {
    beforeEach(() => {
      startScan(5)
    })

    it('sets status to completed', () => {
      completeScan(10)
      const progress = getScanProgress()
      expect(progress.status).toBe('completed')
    })

    it('sets reposFound', () => {
      completeScan(25)
      const progress = getScanProgress()
      expect(progress.reposFound).toBe(25)
    })

    it('sets completedAt to current time', () => {
      const before = Date.now()
      completeScan(10)
      const after = Date.now()
      const progress = getScanProgress()
      expect(progress.completedAt).toBeGreaterThanOrEqual(before)
      expect(progress.completedAt).toBeLessThanOrEqual(after)
    })

    it('preserves startedAt', () => {
      const progressBefore = getScanProgress()
      completeScan(10)
      const progressAfter = getScanProgress()
      expect(progressAfter.startedAt).toBe(progressBefore.startedAt)
    })
  })

  describe('failScan', () => {
    beforeEach(() => {
      startScan(5)
    })

    it('sets status to error', () => {
      failScan('Something went wrong')
      const progress = getScanProgress()
      expect(progress.status).toBe('error')
    })

    it('sets error message', () => {
      failScan('Directory not found')
      const progress = getScanProgress()
      expect(progress.error).toBe('Directory not found')
    })

    it('sets completedAt to current time', () => {
      const before = Date.now()
      failScan('Error')
      const after = Date.now()
      const progress = getScanProgress()
      expect(progress.completedAt).toBeGreaterThanOrEqual(before)
      expect(progress.completedAt).toBeLessThanOrEqual(after)
    })

    it('preserves other state', () => {
      updateScanProgress({ currentDirectory: '/test', reposFound: 5 })
      failScan('Error')
      const progress = getScanProgress()
      expect(progress.currentDirectory).toBe('/test')
      expect(progress.reposFound).toBe(5)
    })
  })

  describe('resetScan', () => {
    it('resets all fields to initial state', () => {
      startScan(5)
      updateScanProgress({ currentDirectory: '/test', reposFound: 10 })
      completeScan(10)

      resetScan()
      const progress = getScanProgress()
      expect(progress.status).toBe('idle')
      expect(progress.currentDirectory).toBe('')
      expect(progress.currentDirectoryIndex).toBe(0)
      expect(progress.totalDirectories).toBe(0)
      expect(progress.reposFound).toBe(0)
      expect(progress.startedAt).toBeNull()
      expect(progress.completedAt).toBeNull()
      expect(progress.error).toBeNull()
    })

    it('resets from error state', () => {
      startScan(5)
      failScan('Error')
      resetScan()
      const progress = getScanProgress()
      expect(progress.status).toBe('idle')
      expect(progress.error).toBeNull()
    })
  })

  describe('isScanInProgress', () => {
    it('returns false when idle', () => {
      expect(isScanInProgress()).toBe(false)
    })

    it('returns true when scanning', () => {
      startScan(5)
      expect(isScanInProgress()).toBe(true)
    })

    it('returns false when completed', () => {
      startScan(5)
      completeScan(10)
      expect(isScanInProgress()).toBe(false)
    })

    it('returns false when error', () => {
      startScan(5)
      failScan('Error')
      expect(isScanInProgress()).toBe(false)
    })
  })

  describe('subscribeToProgress', () => {
    it('receives updates when progress changes', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToProgress(listener)

      startScan(5)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scanning', totalDirectories: 5 })
      )

      unsubscribe()
    })

    it('receives updates for all state changes', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToProgress(listener)

      startScan(3)
      updateScanProgress({ currentDirectory: '/test' })
      updateScanProgress({ reposFound: 5 })
      completeScan(5)

      expect(listener).toHaveBeenCalledTimes(4)

      unsubscribe()
    })

    it('unsubscribe stops receiving updates', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToProgress(listener)

      startScan(5)
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      updateScanProgress({ reposFound: 10 })
      completeScan(10)
      expect(listener).toHaveBeenCalledTimes(1) // Still 1
    })

    it('supports multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsubscribe1 = subscribeToProgress(listener1)
      const unsubscribe2 = subscribeToProgress(listener2)

      startScan(5)
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)

      unsubscribe1()

      updateScanProgress({ reposFound: 10 })
      expect(listener1).toHaveBeenCalledTimes(1) // No longer receiving
      expect(listener2).toHaveBeenCalledTimes(2) // Still receiving

      unsubscribe2()
    })

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const unsubscribe1 = subscribeToProgress(errorListener)
      const unsubscribe2 = subscribeToProgress(normalListener)

      startScan(5)

      // Error listener was called and threw
      expect(errorListener).toHaveBeenCalledTimes(1)
      // Normal listener still received the update
      expect(normalListener).toHaveBeenCalledTimes(1)
      // Error was logged
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      unsubscribe1()
      unsubscribe2()
    })

    it('receives a copy of state, not the original', () => {
      let receivedProgress: ScanProgress | null = null
      const listener = (progress: ScanProgress) => {
        receivedProgress = progress
      }
      const unsubscribe = subscribeToProgress(listener)

      startScan(5)

      // Modify received progress
      if (receivedProgress) {
        (receivedProgress as ScanProgress).reposFound = 999
      }

      // Original state should be unchanged
      const currentProgress = getScanProgress()
      expect(currentProgress.reposFound).toBe(0)

      unsubscribe()
    })
  })

  describe('full scan workflow', () => {
    it('simulates a complete scan lifecycle', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToProgress(listener)

      // Start scan
      startScan(3)
      expect(isScanInProgress()).toBe(true)

      // Scan directory 1
      updateScanProgress({
        currentDirectory: '/projects/web',
        currentDirectoryIndex: 1,
        reposFound: 5,
      })

      // Scan directory 2
      updateScanProgress({
        currentDirectory: '/projects/mobile',
        currentDirectoryIndex: 2,
        reposFound: 8,
      })

      // Scan directory 3
      updateScanProgress({
        currentDirectory: '/projects/backend',
        currentDirectoryIndex: 3,
        reposFound: 12,
      })

      // Complete
      completeScan(12)
      expect(isScanInProgress()).toBe(false)

      const finalProgress = getScanProgress()
      expect(finalProgress.status).toBe('completed')
      expect(finalProgress.reposFound).toBe(12)
      expect(finalProgress.startedAt).not.toBeNull()
      expect(finalProgress.completedAt).not.toBeNull()
      expect(finalProgress.completedAt! - finalProgress.startedAt!).toBeGreaterThanOrEqual(0)

      // Listener received all updates
      expect(listener).toHaveBeenCalledTimes(5) // start + 3 updates + complete

      unsubscribe()
    })

    it('simulates a failed scan', () => {
      startScan(3)
      updateScanProgress({ currentDirectory: '/projects/web', currentDirectoryIndex: 1 })
      failScan('Permission denied')

      const progress = getScanProgress()
      expect(progress.status).toBe('error')
      expect(progress.error).toBe('Permission denied')
      expect(progress.currentDirectory).toBe('/projects/web')
      expect(isScanInProgress()).toBe(false)
    })
  })
})
