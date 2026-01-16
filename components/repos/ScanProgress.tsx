"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, XCircle, FolderSearch } from "lucide-react"
import type { ScanProgress as ScanProgressType } from "@/lib/services/scan-progress"

interface ScanProgressProps {
  onComplete?: () => void
}

export function ScanProgress({ onComplete }: ScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgressType | null>(null)

  useEffect(() => {
    const eventSource = new EventSource("/api/scan/progress")

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ScanProgressType
        setProgress(data)

        // Notify parent when scan completes
        if (data.status === "completed" || data.status === "error") {
          onComplete?.()
        }
      } catch (e) {
        console.error("Failed to parse scan progress:", e)
      }
    }

    eventSource.onerror = () => {
      // Connection closed, try to reconnect
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [onComplete])

  // Don't show anything if no progress or idle
  if (!progress || progress.status === "idle") {
    return null
  }

  const progressPercent =
    progress.totalDirectories > 0
      ? Math.round((progress.currentDirectoryIndex / progress.totalDirectories) * 100)
      : 0

  const duration = progress.startedAt
    ? Math.round((Date.now() - progress.startedAt) / 1000)
    : 0

  return (
    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3">
      {/* Status Header */}
      <div className="flex items-center gap-3">
        {progress.status === "scanning" && (
          <>
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="font-medium">Scanning directories...</span>
          </>
        )}
        {progress.status === "completed" && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-600 dark:text-green-400">
              Scan completed
            </span>
          </>
        )}
        {progress.status === "error" && (
          <>
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-600 dark:text-red-400">
              Scan failed
            </span>
          </>
        )}
      </div>

      {/* Progress Bar */}
      {progress.status === "scanning" && progress.totalDirectories > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>
              Directory {progress.currentDirectoryIndex} of {progress.totalDirectories}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Directory */}
      {progress.status === "scanning" && progress.currentDirectory && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <FolderSearch className="h-4 w-4 flex-shrink-0" />
          <span className="truncate font-mono text-xs">
            {progress.currentDirectory}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          <strong>{progress.reposFound}</strong> repositories found
        </span>
        {duration > 0 && (
          <span>
            <strong>{duration}s</strong> elapsed
          </span>
        )}
      </div>

      {/* Error Message */}
      {progress.status === "error" && progress.error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded">
          {progress.error}
        </div>
      )}
    </div>
  )
}
