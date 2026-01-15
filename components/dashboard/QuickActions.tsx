"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScanButton } from "@/components/repos/ScanButton"
import { ArrowRight, GitBranch, Shuffle, Settings } from "lucide-react"

interface QuickActionsProps {
  pendingCount: number
  readyForTriageCount: number
}

export function QuickActions({ pendingCount, readyForTriageCount }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-zinc-500" />
            <span className="text-sm">Scan for repositories</span>
          </div>
          <ScanButton />
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                {pendingCount} pending assignment
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/repos?status=pending">
                View
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {readyForTriageCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                {readyForTriageCount} ready to organize
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/triage">
                Triage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-500" />
            <span className="text-sm">Configure settings</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/settings">
              Settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
