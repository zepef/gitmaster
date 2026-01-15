"use client"

import { MoveResult } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"

interface MoveProgressProps {
  results: MoveResult[]
}

export function MoveProgress({ results }: MoveProgressProps) {
  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{successful.length} moved successfully</span>
        </div>
        {failed.length > 0 && (
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-4 w-4" />
            <span>{failed.length} failed</span>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {results.map((result) => (
          <div
            key={result.repoId}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              result.success
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <span className="font-medium">{result.repoName}</span>

              {result.success ? (
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                  <span className="truncate max-w-[150px] font-mono">
                    {result.from}
                  </span>
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[150px] font-mono">
                    {result.to}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {result.error}
                </p>
              )}
            </div>

            <Badge variant={result.success ? "success" : "destructive"}>
              {result.success ? "Moved" : "Failed"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
