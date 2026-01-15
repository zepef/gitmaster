"use client"

import { useState } from "react"
import { RepoTable } from "./RepoTable"
import { BulkActions } from "./BulkActions"

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

interface RepoListClientProps {
  repositories: Repository[]
  themes: Theme[]
}

export function RepoListClient({ repositories, themes }: RepoListClientProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  return (
    <div className="space-y-4">
      <BulkActions
        selectedIds={selectedIds}
        themes={themes}
        onClearSelection={() => setSelectedIds([])}
      />
      <RepoTable
        repositories={repositories}
        themes={themes}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  )
}
