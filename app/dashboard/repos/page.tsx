import { Suspense } from "react"
import { getRepositories, getRepositoryCounts, getThemes } from "@/lib/actions"
import { ScanButton } from "@/components/repos/ScanButton"
import { RepoFilters } from "@/components/repos/RepoFilters"
import { RepoListClient } from "@/components/repos/RepoListClient"
import { TriageStatus } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface ReposPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

export default async function ReposPage({ searchParams }: ReposPageProps) {
  const params = await searchParams
  const status = params.status as TriageStatus | 'all' | undefined
  const search = params.search

  const [repositories, counts, themes] = await Promise.all([
    getRepositories({ status, search }),
    getRepositoryCounts(),
    getThemes(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Repositories</h1>
          <p className="text-sm text-zinc-500">
            Manage and organize your local git repositories
          </p>
        </div>
        <ScanButton />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading filters...
          </div>
        }
      >
        <RepoFilters counts={counts} />
      </Suspense>

      <RepoListClient repositories={repositories} themes={themes} />
    </div>
  )
}
