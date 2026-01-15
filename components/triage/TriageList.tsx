"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { GitBranch, AlertTriangle } from "lucide-react"

interface Repository {
  id: number
  name: string
  originalPath: string
  theme: string | null
  isDirty: boolean
}

interface TriageListProps {
  repositories: Repository[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
}

export function TriageList({
  repositories,
  selectedIds,
  onSelectionChange,
}: TriageListProps) {
  const allSelected =
    repositories.length > 0 &&
    repositories.every((r) => selectedIds.includes(r.id))

  function toggleSelectAll() {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(repositories.map((r) => r.id))
    }
  }

  function toggleSelect(id: number) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <GitBranch className="mx-auto h-12 w-12 text-zinc-300" />
        <h3 className="mt-4 text-lg font-medium">No repositories to triage</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Assign themes to repositories on the Repositories page first.
        </p>
      </div>
    )
  }

  // Group by theme
  const groupedByTheme = repositories.reduce((acc, repo) => {
    const theme = repo.theme || "unassigned"
    if (!acc[theme]) {
      acc[theme] = []
    }
    acc[theme].push(repo)
    return acc
  }, {} as Record<string, Repository[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
          data-testid="select-all-pending"
        />
        <span className="text-sm text-zinc-500">
          Select all ({repositories.length})
        </span>
      </div>

      {Object.entries(groupedByTheme).map(([theme, repos]) => (
        <div key={theme} className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {theme} ({repos.length})
          </h3>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            {repos.map((repo, index) => (
              <div
                key={repo.id}
                className={`flex items-center gap-3 p-3 ${
                  index > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                }`}
              >
                <Checkbox
                  checked={selectedIds.includes(repo.id)}
                  onCheckedChange={() => toggleSelect(repo.id)}
                  aria-label={`Select ${repo.name}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{repo.name}</span>
                    {repo.isDirty && (
                      <Badge variant="warning" className="text-xs">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Dirty
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    {repo.originalPath}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
