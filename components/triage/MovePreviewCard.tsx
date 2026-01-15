import { MovePreview } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, AlertTriangle, AlertCircle } from "lucide-react"

interface MovePreviewCardProps {
  preview: MovePreview
}

export function MovePreviewCard({ preview }: MovePreviewCardProps) {
  const hasConflicts = preview.conflicts.length > 0
  const hasWarnings = preview.warnings.length > 0

  return (
    <div
      className={`rounded-lg border p-4 ${
        hasConflicts
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          : hasWarnings
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
      data-testid="move-preview"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{preview.repoName}</span>
            <Badge variant="secondary" className="text-xs">
              {preview.theme}
            </Badge>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-zinc-500 font-mono truncate max-w-[200px]">
              {preview.from}
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[200px]">
              {preview.to || "N/A"}
            </span>
          </div>
        </div>

        {(hasConflicts || hasWarnings) && (
          <div className="flex-shrink-0">
            {hasConflicts ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
          </div>
        )}
      </div>

      {hasConflicts && (
        <div className="mt-3 space-y-1">
          {preview.conflicts.map((conflict, i) => (
            <p key={i} className="text-sm text-red-600 dark:text-red-400">
              {conflict}
            </p>
          ))}
        </div>
      )}

      {hasWarnings && (
        <div className="mt-3 space-y-1" data-testid="move-warning">
          {preview.warnings.map((warning, i) => (
            <p key={i} className="text-sm text-amber-600 dark:text-amber-400">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
