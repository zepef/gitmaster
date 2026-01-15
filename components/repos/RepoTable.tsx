"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ThemeSelector } from "./ThemeSelector"
import { AlertTriangle, ExternalLink, FolderOpen, GitBranch } from "lucide-react"
import Link from "next/link"

interface Repository {
  id: number
  name: string
  originalPath: string
  physicalPath: string | null
  remoteUrl: string | null
  theme: string | null
  triageStatus: string | null
  isDirty: boolean
}

interface Theme {
  id: number
  name: string
  color: string | null
}

interface RepoTableProps {
  repositories: Repository[]
  themes: Theme[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
}

export function RepoTable({
  repositories,
  themes,
  selectedIds,
  onSelectionChange,
}: RepoTableProps) {
  const showPerformanceWarning = repositories.length > 1000

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

  function getStatusBadge(status: string | null) {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "manual":
        return <Badge variant="secondary">Assigned</Badge>
      case "auto":
        return <Badge variant="success">Organized</Badge>
      case "ignored":
        return <Badge variant="destructive">Ignored</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <FolderOpen className="mx-auto h-12 w-12 text-zinc-300" />
        <h3 className="mt-4 text-lg font-medium">No repositories found</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Try adjusting your filters or run a scan to discover repositories.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showPerformanceWarning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Large collection detected</AlertTitle>
          <AlertDescription>
            You have {repositories.length} repositories. Consider using filters
            to improve performance.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <th className="w-12 p-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Path</th>
              <th className="p-3 text-left text-sm font-medium">Theme</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="w-20 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {repositories.map((repo) => (
              <tr
                key={repo.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                data-testid="repo-row"
              >
                <td className="p-3">
                  <Checkbox
                    checked={selectedIds.includes(repo.id)}
                    onCheckedChange={() => toggleSelect(repo.id)}
                    aria-label={`Select ${repo.name}`}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-zinc-400" />
                    <span className="font-medium">{repo.name}</span>
                    {repo.isDirty && (
                      <Badge variant="warning" className="text-xs">
                        Dirty
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-sm text-zinc-500 font-mono">
                    {repo.physicalPath || repo.originalPath}
                  </span>
                </td>
                <td className="p-3">
                  <ThemeSelector
                    repoId={repo.id}
                    repoName={repo.name}
                    currentTheme={repo.theme}
                    themes={themes}
                  />
                </td>
                <td className="p-3">{getStatusBadge(repo.triageStatus)}</td>
                <td className="p-3">
                  {repo.remoteUrl && (
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={repo.remoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open on GitHub"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
