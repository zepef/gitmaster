"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { bulkAssignTheme } from "@/lib/actions"
import { toast } from "sonner"
import { Tag, X } from "lucide-react"

interface Theme {
  id: number
  name: string
  color: string | null
}

interface BulkActionsProps {
  selectedIds: number[]
  themes: Theme[]
  onClearSelection: () => void
}

export function BulkActions({
  selectedIds,
  themes,
  onClearSelection,
}: BulkActionsProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>("")
  const [isApplying, setIsApplying] = useState(false)

  if (selectedIds.length === 0) {
    return null
  }

  async function handleApplyTheme() {
    if (!selectedTheme) {
      toast.error("Please select a theme")
      return
    }

    setIsApplying(true)

    try {
      const result = await bulkAssignTheme(selectedIds, selectedTheme)

      if (result.success) {
        toast.success(result.message)
        onClearSelection()
        setSelectedTheme("")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to apply theme")
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>

      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-zinc-400" />
        <Select value={selectedTheme} onValueChange={setSelectedTheme}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.name}>
                <div className="flex items-center gap-2">
                  {theme.color && (
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: theme.color }}
                    />
                  )}
                  {theme.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleApplyTheme}
          disabled={!selectedTheme || isApplying}
        >
          Apply
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="ml-auto"
      >
        <X className="mr-1 h-4 w-4" />
        Clear
      </Button>
    </div>
  )
}
