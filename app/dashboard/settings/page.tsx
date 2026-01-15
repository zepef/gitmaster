import { getSettings, getScanDirectories, getThemes } from "@/lib/actions"
import { SettingsForm } from "@/components/settings/SettingsForm"
import { ScanDirectoryList } from "@/components/settings/ScanDirectoryList"
import { ThemeManager } from "@/components/settings/ThemeManager"
import { OnboardingWizard } from "@/components/settings/OnboardingWizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsPageProps {
  searchParams: Promise<{
    onboarding?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams
  const isOnboarding = params.onboarding === "true"

  const [settings, scanDirectories, themes] = await Promise.all([
    getSettings(),
    getScanDirectories(),
    getThemes(),
  ])

  // Show onboarding wizard if this is first-time setup
  if (isOnboarding || (!settings.organizationRoot && scanDirectories.length === 0)) {
    return (
      <OnboardingWizard
        scanDirectories={scanDirectories}
        hasOrganizationRoot={!!settings.organizationRoot}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">
          Configure your Codebase Hub preferences
        </p>
      </div>

      <div className="grid gap-6">
        <SettingsForm settings={settings} />

        <Card>
          <CardHeader>
            <CardTitle>Scan Directories</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanDirectoryList directories={scanDirectories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme Management</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeManager themes={themes} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
