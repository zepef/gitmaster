"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useCallback, useState, useTransition } from "react"

interface RepoFiltersProps {
  counts: {
    total: number
    pending: number
    manual: number
    auto: number
    ignored: number
  }
}

export function RepoFilters({ counts }: RepoFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get("status") || "all"
  const currentSearch = searchParams.get("search") || ""
  const [searchValue, setSearchValue] = useState(currentSearch)

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }

      startTransition(() => {
        router.push(`/dashboard/repos?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchValue(value)

      // Debounce search
      const timeoutId = setTimeout(() => {
        updateFilter("search", value)
      }, 300)

      return () => clearTimeout(timeoutId)
    },
    [updateFilter]
  )

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={currentStatus}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <TabsList>
          <TabsTrigger value="all">
            All ({counts.total})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="manual">
            Assigned ({counts.manual})
          </TabsTrigger>
          <TabsTrigger value="auto">
            Organized ({counts.auto})
          </TabsTrigger>
          <TabsTrigger value="ignored">
            Ignored ({counts.ignored})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search repositories..."
          className="pl-9"
          value={searchValue}
          onChange={handleSearch}
        />
      </div>
    </div>
  )
}
