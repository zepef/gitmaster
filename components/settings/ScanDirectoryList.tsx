"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  addScanDirectory,
  removeScanDirectory,
  toggleScanDirectory,
} from "@/lib/actions"
import { toast } from "sonner"
import { FolderOpen, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

interface ScanDirectory {
  id: number
  path: string
  isWsl: boolean
  enabled: boolean
}

interface ScanDirectoryListProps {
  directories: ScanDirectory[]
}

export function ScanDirectoryList({ directories }: ScanDirectoryListProps) {
  const [newPath, setNewPath] = useState("")
  const [isWsl, setIsWsl] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  async function handleAdd() {
    if (!newPath.trim()) {
      toast.error("Please enter a path")
      return
    }

    setIsAdding(true)

    try {
      const result = await addScanDirectory(newPath.trim(), isWsl)

      if (result.success) {
        toast.success(result.message)
        setNewPath("")
        setIsWsl(false)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to add directory")
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(id: number) {
    const result = await removeScanDirectory(id)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  async function handleToggle(id: number) {
    const result = await toggleScanDirectory(id)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Scan Directories</Label>
        <p className="text-xs text-zinc-500 mt-1">
          Add directories where your repositories are located
        </p>
      </div>

      {directories.length > 0 && (
        <div className="space-y-2">
          {directories.map((dir) => (
            <div
              key={dir.id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                dir.enabled
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  : "border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900"
              }`}
            >
              <FolderOpen
                className={`h-4 w-4 ${
                  dir.enabled ? "text-zinc-500" : "text-zinc-300"
                }`}
              />
              <span
                className={`flex-1 font-mono text-sm ${
                  dir.enabled ? "" : "text-zinc-400"
                }`}
              >
                {dir.path}
              </span>
              {dir.isWsl && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  WSL
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggle(dir.id)}
                title={dir.enabled ? "Disable" : "Enable"}
              >
                {dir.enabled ? (
                  <ToggleRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-zinc-400" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(dir.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="E:\Projects or /mnt/c/Projects"
            className="pl-10 font-mono"
            data-testid="scan-dir-input"
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 dark:border-zinc-800">
          <Checkbox
            id="isWsl"
            checked={isWsl}
            onCheckedChange={(checked) => setIsWsl(checked === true)}
          />
          <Label htmlFor="isWsl" className="text-sm cursor-pointer">
            WSL
          </Label>
        </div>
        <Button
          onClick={handleAdd}
          disabled={isAdding}
          data-testid="add-scan-dir"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
