"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { TriageList } from "./TriageList"
import { PreviewTable } from "./PreviewTable"
import { MoveProgress } from "./MoveProgress"
import { generateMovePreview, executeMoves } from "@/lib/actions"
import { MovePreview, MoveResult, DEFAULT_MOVE_OPTIONS } from "@/lib/types"
import { toast } from "sonner"
import { Eye, Play, Loader2, CheckCircle2 } from "lucide-react"

interface Repository {
  id: number
  name: string
  originalPath: string
  theme: string | null
  isDirty: boolean
}

interface TriageClientProps {
  repositories: Repository[]
}

type Step = "select" | "preview" | "executing" | "complete"

export function TriageClient({ repositories }: TriageClientProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [step, setStep] = useState<Step>("select")
  const [previews, setPreviews] = useState<MovePreview[]>([])
  const [results, setResults] = useState<MoveResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  async function handleGeneratePreview() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one repository")
      return
    }

    setIsLoading(true)

    try {
      const result = await generateMovePreview(selectedIds)

      if (result.success) {
        setPreviews(result.data)
        setStep("preview")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to generate preview")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleExecuteMoves() {
    setIsConfirmOpen(false)
    setStep("executing")
    setIsLoading(true)

    try {
      const validPreviews = previews.filter(
        (p) => p.conflicts.length === 0 && p.to
      )

      const result = await executeMoves(validPreviews, DEFAULT_MOVE_OPTIONS)

      if (result.success) {
        setResults(result.data.results)
        setStep("complete")
        toast.success(result.message)
      } else {
        toast.error(result.error)
        setStep("preview")
      }
    } catch {
      toast.error("Failed to execute moves")
      setStep("preview")
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setSelectedIds([])
    setPreviews([])
    setResults([])
    setStep("select")
  }

  const validPreviewCount = previews.filter(
    (p) => p.conflicts.length === 0 && p.to
  ).length

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-4 text-sm">
        <span
          className={step === "select" ? "font-medium" : "text-zinc-500"}
        >
          1. Select
        </span>
        <span className="text-zinc-300">/</span>
        <span
          className={step === "preview" ? "font-medium" : "text-zinc-500"}
        >
          2. Preview
        </span>
        <span className="text-zinc-300">/</span>
        <span
          className={
            step === "executing" || step === "complete"
              ? "font-medium"
              : "text-zinc-500"
          }
        >
          3. Execute
        </span>
      </div>

      {/* Step content */}
      {step === "select" && (
        <>
          <TriageList
            repositories={repositories}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {repositories.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={handleGeneratePreview}
                disabled={selectedIds.length === 0 || isLoading}
                data-testid="preview-moves"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Preview Moves ({selectedIds.length})
              </Button>
            </div>
          )}
        </>
      )}

      {step === "preview" && (
        <>
          <PreviewTable previews={previews} />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("select")}>
              Back to Selection
            </Button>
            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={validPreviewCount === 0}
              data-testid="confirm-moves"
            >
              <Play className="mr-2 h-4 w-4" />
              Execute {validPreviewCount} Moves
            </Button>
          </div>
        </>
      )}

      {step === "executing" && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-4 text-zinc-500">Moving repositories...</p>
        </div>
      )}

      {step === "complete" && (
        <>
          <MoveProgress results={results} />

          <div className="flex justify-center">
            <Button onClick={handleReset}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Done
            </Button>
          </div>
        </>
      )}

      {/* Confirmation dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Move Operations</DialogTitle>
            <DialogDescription>
              You are about to move {validPreviewCount} repositories. This will
              physically relocate the folders on your file system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This action:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>• Moves repository folders to theme directories</li>
              <li>• Updates the database with new locations</li>
              <li>• Cannot be automatically undone</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteMoves} data-testid="execute-moves">
              <Play className="mr-2 h-4 w-4" />
              Execute Moves
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
