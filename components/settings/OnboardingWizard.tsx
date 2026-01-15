"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PathInput } from "./PathInput"
import { ScanDirectoryList } from "./ScanDirectoryList"
import { updateSettings, createDefaultThemes, triggerScan } from "@/lib/actions"
import { toast } from "sonner"
import { ArrowRight, Check, FolderTree, Scan, Palette, Loader2 } from "lucide-react"

interface ScanDirectory {
  id: number
  path: string
  isWsl: boolean
  enabled: boolean
}

interface OnboardingWizardProps {
  scanDirectories: ScanDirectory[]
  hasOrganizationRoot: boolean
}

export function OnboardingWizard({
  scanDirectories,
  hasOrganizationRoot,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(hasOrganizationRoot ? 2 : 1)
  const [organizationRoot, setOrganizationRoot] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  const canProceedStep1 = organizationRoot.trim().length >= 3
  const canProceedStep2 = scanDirectories.length > 0

  async function handleSaveOrganizationRoot() {
    if (!canProceedStep1) return

    setIsSaving(true)
    setError("")

    try {
      const result = await updateSettings({ organizationRoot: organizationRoot.trim() })

      if (result.success) {
        toast.success("Organization root saved")
        setStep(2)
      } else {
        setError(result.error)
      }
    } catch {
      setError("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateDefaultThemes() {
    const result = await createDefaultThemes()

    if (result.success) {
      toast.success(result.message)
    } else {
      // Themes might already exist, that's okay
      if (!result.error.includes("already exist")) {
        toast.error(result.error)
      }
    }
  }

  async function handleFinish() {
    setIsScanning(true)

    try {
      // Create default themes if they don't exist
      await handleCreateDefaultThemes()

      // Trigger initial scan
      const scanResult = await triggerScan()

      if (scanResult.success) {
        toast.success(scanResult.message || "Setup complete!")
      } else {
        toast.error(scanResult.error)
      }

      // Redirect to repos page
      router.push("/dashboard/repos")
    } catch {
      toast.error("Failed to complete setup")
      setIsScanning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome to Codebase Hub</h1>
        <p className="text-zinc-500 mt-2">
          Let&apos;s set up your workspace in a few quick steps
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step > s
                  ? "bg-green-500 text-white"
                  : step === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-12 ${
                  step > s ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Organization Root */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Step 1: Set Organization Root
            </CardTitle>
            <CardDescription>
              Choose where your organized repositories will be stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PathInput
              id="organizationRoot"
              label="Organization Root"
              value={organizationRoot}
              onChange={(value) => {
                setOrganizationRoot(value)
                setError("")
              }}
              placeholder="D:\Codebase\organized"
              description="Repositories will be organized into theme folders within this directory"
              error={error}
              required
            />

            <Button
              onClick={handleSaveOrganizationRoot}
              disabled={!canProceedStep1 || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scan Directories */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Step 2: Add Scan Directories
            </CardTitle>
            <CardDescription>
              Add directories where your repositories are currently located
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScanDirectoryList directories={scanDirectories} />

            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="w-full"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Finish */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Step 3: Complete Setup
            </CardTitle>
            <CardDescription>
              We&apos;ll create default themes and scan your directories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              <p className="text-sm font-medium">Default themes will be created:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["nextjs", "python", "experiments", "archived", "unclassified"].map(
                  (theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-zinc-200 px-3 py-1 text-xs dark:bg-zinc-800"
                    >
                      {theme}
                    </span>
                  )
                )}
              </div>
            </div>

            <Button
              onClick={handleFinish}
              disabled={isScanning}
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Setup & Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
