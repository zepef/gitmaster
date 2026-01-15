"use client"

import { MovePreview } from "@/lib/types"
import { MovePreviewCard } from "./MovePreviewCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

interface PreviewTableProps {
  previews: MovePreview[]
}

export function PreviewTable({ previews }: PreviewTableProps) {
  const validMoves = previews.filter((p) => p.conflicts.length === 0 && p.to)
  const invalidMoves = previews.filter((p) => p.conflicts.length > 0 || !p.to)
  const warningMoves = validMoves.filter((p) => p.warnings.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{validMoves.length} ready to move</span>
        </div>
        {warningMoves.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{warningMoves.length} with warnings</span>
          </div>
        )}
        {invalidMoves.length > 0 && (
          <div className="flex items-center gap-2 text-red-500">
            <span>{invalidMoves.length} cannot be moved</span>
          </div>
        )}
      </div>

      {warningMoves.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Some repositories have warnings</AlertTitle>
          <AlertDescription>
            Review the warnings below. These repositories can still be moved,
            but you should verify the changes are safe.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {previews.map((preview) => (
          <MovePreviewCard key={preview.repoId} preview={preview} />
        ))}
      </div>
    </div>
  )
}
