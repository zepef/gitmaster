"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createTheme, deleteTheme, createDefaultThemes } from "@/lib/actions"
import { toast } from "sonner"
import { Palette, Plus, Trash2, Wand2 } from "lucide-react"

interface Theme {
  id: number
  name: string
  color: string | null
  description: string | null
}

interface ThemeManagerProps {
  themes: Theme[]
}

export function ThemeManager({ themes }: ThemeManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeColor, setNewThemeColor] = useState("#6B7280")
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreateDefaults() {
    const result = await createDefaultThemes()

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  async function handleCreate() {
    if (!newThemeName.trim()) {
      toast.error("Please enter a theme name")
      return
    }

    setIsCreating(true)

    try {
      const result = await createTheme({
        name: newThemeName.toLowerCase().replace(/\s+/g, "-"),
        color: newThemeColor,
      })

      if (result.success) {
        toast.success(result.message)
        setIsDialogOpen(false)
        setNewThemeName("")
        setNewThemeColor("#6B7280")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to create theme")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete the theme "${name}"?`)) {
      return
    }

    const result = await deleteTheme(id)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Themes</Label>
          <p className="text-xs text-zinc-500 mt-1">
            Organize your repositories by theme
          </p>
        </div>
        <div className="flex gap-2">
          {themes.length === 0 && (
            <Button variant="outline" onClick={handleCreateDefaults}>
              <Wand2 className="mr-2 h-4 w-4" />
              Create Defaults
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Theme
          </Button>
        </div>
      </div>

      {themes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div
                className="h-6 w-6 rounded-full border border-zinc-200 dark:border-zinc-700"
                style={{ backgroundColor: theme.color || "#6B7280" }}
              />
              <div className="flex-1">
                <p className="font-medium">{theme.name}</p>
                {theme.description && (
                  <p className="text-xs text-zinc-500">{theme.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(theme.id, theme.name)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {themes.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
          <Palette className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-2 text-sm text-zinc-500">
            No themes yet. Create default themes or add your own.
          </p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="themeName">Name</Label>
              <Input
                id="themeName"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="my-theme"
              />
              <p className="text-xs text-zinc-500">
                Lowercase letters, numbers, and dashes only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeColor">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="themeColor"
                  type="color"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="h-10 w-16 p-1"
                />
                <Input
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
