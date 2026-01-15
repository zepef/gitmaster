import { getRepositoryCounts, getTriageReady, isSetupComplete } from "@/lib/actions"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  GitBranch,
  Clock,
  CheckCircle2,
  FolderOpen,
  AlertTriangle,
  ArrowRight,
  Settings,
} from "lucide-react"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const setupComplete = await isSetupComplete()

  // Redirect to settings if setup is not complete
  if (!setupComplete) {
    redirect("/dashboard/settings?onboarding=true")
  }

  const [counts, triageReady] = await Promise.all([
    getRepositoryCounts(),
    getTriageReady(),
  ])

  // Count repos ready for triage (have theme but not moved)
  const readyForTriageCount = triageReady.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Overview of your repository organization
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Repositories"
          value={counts.total}
          icon={GitBranch}
        />
        <StatsCard
          title="Pending Assignment"
          value={counts.pending}
          description="Repos without a theme"
          icon={Clock}
          variant={counts.pending > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Organized"
          value={counts.auto}
          description="Moved to theme folders"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Dirty Repos"
          value={counts.dirty}
          description="Has uncommitted changes"
          icon={AlertTriangle}
          variant={counts.dirty > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <QuickActions
          pendingCount={counts.pending}
          readyForTriageCount={readyForTriageCount}
        />

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organization Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Organization Progress</span>
                  <span>
                    {counts.total > 0
                      ? Math.round((counts.auto / counts.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{
                      width: `${
                        counts.total > 0
                          ? (counts.auto / counts.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm">
                    Pending: {counts.pending}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">
                    Assigned: {counts.manual}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Organized: {counts.auto}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-zinc-400" />
                  <span className="text-sm">
                    Ignored: {counts.ignored}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {counts.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-zinc-300" />
            <h3 className="mt-4 text-lg font-medium">No repositories found</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
              Get started by configuring your scan directories and running your
              first scan to discover repositories.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configure Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
