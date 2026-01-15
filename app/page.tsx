import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GitBranch, FolderTree, Scan, Shield } from "lucide-react"

export default async function Home() {
  const session = await auth()

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            <span className="text-xl font-semibold">Codebase Hub</span>
          </div>
          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/dashboard" })
            }}
          >
            <Button type="submit">Sign in with GitHub</Button>
          </form>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Organize Your Local Codebase
            </h1>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Centralize, organize, and sync your local git repositories.
              Stop hunting through scattered folders and take control of your
              development workspace.
            </p>
            <div className="mt-10">
              <form
                action={async () => {
                  "use server"
                  await signIn("github", { redirectTo: "/dashboard" })
                }}
              >
                <Button type="submit" size="lg">
                  <GitBranch className="mr-2 h-5 w-5" />
                  Get Started with GitHub
                </Button>
              </form>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid gap-8 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Scan className="h-10 w-10 text-zinc-700 dark:text-zinc-300" />
                <CardTitle className="mt-4">Auto-Discovery</CardTitle>
                <CardDescription>
                  Scan your drives to automatically discover all git
                  repositories, no matter where they&apos;re scattered.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FolderTree className="h-10 w-10 text-zinc-700 dark:text-zinc-300" />
                <CardTitle className="mt-4">Theme Organization</CardTitle>
                <CardDescription>
                  Organize repositories by themes (Next.js, Python, experiments)
                  and physically move them to structured folders.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-zinc-700 dark:text-zinc-300" />
                <CardTitle className="mt-4">Safe Operations</CardTitle>
                <CardDescription>
                  Preview all file operations before execution. No auto-moves
                  without your explicit confirmation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How it works */}
          <div className="mt-24">
            <h2 className="text-2xl font-bold text-center">How It Works</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-4">
              {[
                { step: 1, title: "Configure", desc: "Set your organization root and scan directories" },
                { step: 2, title: "Scan", desc: "Discover all repositories on your system" },
                { step: 3, title: "Assign", desc: "Assign themes to categorize your repos" },
                { step: 4, title: "Organize", desc: "Move repos to organized theme folders" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                    {step}
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-zinc-500">
          <p>Codebase Hub — Local/Self-hosted repository management</p>
          <p className="mt-2">
            Designed for Windows/WSL environments with direct file system access
          </p>
        </div>
      </footer>
    </div>
  )
}
