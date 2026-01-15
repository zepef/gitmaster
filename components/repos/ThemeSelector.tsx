"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignTheme } from "@/lib/actions"
import { toast } from "sonner"

interface Theme {
  id: number
  name: string
  color: string | null
}

interface ThemeSelectorProps {
  repoId: number
  repoName: string
  currentTheme: string | null
  themes: Theme[]
}

export function ThemeSelector({
  repoId,
  repoName,
  currentTheme,
  themes,
}: ThemeSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleThemeChange(theme: string) {
    if (theme === currentTheme) return

    setIsUpdating(true)

    try {
      const result = await assignTheme(repoId, theme)

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to assign theme")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Select
      value={currentTheme || ""}
      onValueChange={handleThemeChange}
      disabled={isUpdating}
    >
      <SelectTrigger
        className="w-[140px]"
        data-testid="theme-selector"
      >
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem
            key={theme.id}
            value={theme.name}
            data-testid={`theme-option-${theme.name}`}
          >
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
  )
}
