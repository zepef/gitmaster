/**
 * In-memory scan progress tracking
 * Stores progress state that can be polled by clients
 */

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'completed' | 'error' | 'cancelled'
  currentDirectory: string
  currentDirectoryIndex: number
  totalDirectories: number
  reposFound: number
  startedAt: number | null
  completedAt: number | null
  error: string | null
}

// Cancellation token for stopping scans
let scanCancelled = false

// Global state for scan progress (single instance per server)
let scanProgress: ScanProgress = {
  status: 'idle',
  currentDirectory: '',
  currentDirectoryIndex: 0,
  totalDirectories: 0,
  reposFound: 0,
  startedAt: null,
  completedAt: null,
  error: null,
}

// Event listeners for real-time updates
type ProgressListener = (progress: ScanProgress) => void
const listeners = new Set<ProgressListener>()

/**
 * Get current scan progress
 */
export function getScanProgress(): ScanProgress {
  return { ...scanProgress }
}

/**
 * Start a new scan session
 */
export function startScan(totalDirectories: number): void {
  scanCancelled = false
  scanProgress = {
    status: 'scanning',
    currentDirectory: '',
    currentDirectoryIndex: 0,
    totalDirectories,
    reposFound: 0,
    startedAt: Date.now(),
    completedAt: null,
    error: null,
  }
  notifyListeners()
}

/**
 * Cancel the current scan
 */
export function cancelScan(): void {
  if (scanProgress.status === 'scanning') {
    scanCancelled = true
    scanProgress = {
      ...scanProgress,
      status: 'cancelled',
      completedAt: Date.now(),
    }
    notifyListeners()
  }
}

/**
 * Check if scan has been cancelled
 */
export function isScanCancelled(): boolean {
  return scanCancelled
}

/**
 * Update progress during scan
 */
export function updateScanProgress(update: {
  currentDirectory?: string
  currentDirectoryIndex?: number
  reposFound?: number
}): void {
  scanProgress = {
    ...scanProgress,
    ...update,
  }
  notifyListeners()
}

/**
 * Mark scan as completed
 */
export function completeScan(reposFound: number): void {
  scanProgress = {
    ...scanProgress,
    status: 'completed',
    reposFound,
    completedAt: Date.now(),
  }
  notifyListeners()
}

/**
 * Mark scan as failed
 */
export function failScan(error: string): void {
  scanProgress = {
    ...scanProgress,
    status: 'error',
    error,
    completedAt: Date.now(),
  }
  notifyListeners()
}

/**
 * Reset scan state to idle
 */
export function resetScan(): void {
  scanProgress = {
    status: 'idle',
    currentDirectory: '',
    currentDirectoryIndex: 0,
    totalDirectories: 0,
    reposFound: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  }
  notifyListeners()
}

/**
 * Check if a scan is currently in progress
 */
export function isScanInProgress(): boolean {
  return scanProgress.status === 'scanning'
}

/**
 * Subscribe to progress updates
 */
export function subscribeToProgress(listener: ProgressListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Notify all listeners of progress update
 */
function notifyListeners(): void {
  const progress = getScanProgress()
  listeners.forEach(listener => {
    try {
      listener(progress)
    } catch (e) {
      console.error('Error in progress listener:', e)
    }
  })
}
