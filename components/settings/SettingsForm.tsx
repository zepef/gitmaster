"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PathInput } from "./PathInput"
import { updateSettings } from "@/lib/actions"
import { toast } from "sonner"
import { Save } from "lucide-react"

interface Settings {
  id: number
  organizationRoot: string | null
  autoTriageEnabled: boolean
  backupDestination: string | null
}

interface SettingsFormProps {
  settings: Settings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [organizationRoot, setOrganizationRoot] = useState(
    settings.organizationRoot || ""
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!organizationRoot.trim()) {
      setError("Organization root is required")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const result = await updateSettings({ organizationRoot: organizationRoot.trim() })

      if (result.success) {
        toast.success(result.message)
      } else {
        setError(result.error)
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Root</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PathInput
          id="organizationRoot"
          label="Root Directory"
          value={organizationRoot}
          onChange={(value) => {
            setOrganizationRoot(value)
            setError("")
          }}
          placeholder="D:\Codebase\organized"
          description="This is where your organized repositories will be stored, grouped by theme."
          error={error}
          required
        />

        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Example structure:</strong>
          </p>
          <pre className="mt-2 text-xs text-zinc-500 font-mono">
{`${organizationRoot || "D:\\Codebase\\organized"}
├── nextjs/
│   ├── my-nextjs-app/
│   └── another-project/
├── python/
│   └── ml-project/
└── experiments/
    └── test-repo/`}
          </pre>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  )
}
