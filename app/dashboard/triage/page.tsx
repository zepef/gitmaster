import { getTriageReady } from "@/lib/actions"
import { TriageClient } from "@/components/triage/TriageClient"

export default async function TriagePage() {
  const repositories = await getTriageReady()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Triage</h1>
        <p className="text-sm text-zinc-500">
          Preview and execute repository moves to organized folders
        </p>
      </div>

      <TriageClient repositories={repositories} />
    </div>
  )
}
