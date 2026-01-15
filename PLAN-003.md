# PLAN-003: Codebase Hub Implementation Plan (Final)

**Based on**: PRD-001.md v1.1 + Review Feedback
**Date**: January 15, 2026
**Status**: Ready for implementation

---

## Critical Constraints

### Deployment Target: Local/Self-Hosted Only

> **WARNING**: This application performs **file system operations** (scanning directories, moving folders). It is designed for:
> - Local desktop use (Windows/WSL)
> - Self-hosted server with direct file system access
>
> **NOT suitable for**: Cloud deployment (Vercel, Netlify, etc.) without a separate backend service.

### Safety-First File Operations

All file move operations follow a **Preview → Confirm → Execute** model:
- No auto-moves without explicit user confirmation
- Dry-run preview shows exact operations before execution
- Undo capability via operation logs

---

## First-Time User Flow

### Onboarding Sequence

```
Login (GitHub OAuth)
    ↓
Check: organizationRoot configured?
    ↓ NO
Redirect → /dashboard/settings?onboarding=true
    ↓
Step 1: Set Organization Root (required)
    ↓
Step 2: Add at least one Scan Directory (required)
    ↓
Step 3: Create default themes (optional, suggest defaults)
    ↓
Auto-trigger first scan
    ↓
Redirect → /dashboard/repos (show results)
```

### Implementation Details

```typescript
// middleware.ts - Extended logic
export async function middleware(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Check if setup complete (skip for settings page itself)
  if (!request.nextUrl.pathname.startsWith("/dashboard/settings")) {
    const settings = await getSettings()
    if (!settings?.organizationRoot) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?onboarding=true", request.url)
      )
    }
  }

  return NextResponse.next()
}
```

### Onboarding UI Components

```
components/settings/
├── OnboardingWizard.tsx    # Step-by-step setup
├── SetupProgress.tsx       # Progress indicator (Step 1/3)
└── DefaultThemesPrompt.tsx # Suggest: nextjs, python, experiments, archived
```

### Default Themes (Suggested on First Setup)

| Theme | Color | Description |
|-------|-------|-------------|
| `nextjs` | #000000 | Next.js / React projects |
| `python` | #3776AB | Python projects |
| `experiments` | #FF6B6B | Experimental / learning projects |
| `archived` | #6B7280 | Deprecated / inactive projects |
| `unclassified` | #9CA3AF | Fallback for repos without clear theme |

---

## Error Handling & UX

### Global Error Boundaries

```
app/
├── error.tsx              # Global error boundary
├── not-found.tsx          # 404 page
└── dashboard/
    ├── error.tsx          # Dashboard-specific errors
    └── loading.tsx        # Loading states
```

#### Global Error Page (`app/error.tsx`)

```typescript
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={reset} className="mt-4">Try again</Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### Not Found Page (`app/not-found.tsx`)

```typescript
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The page you're looking for doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Toast Notifications

Install: `npx shadcn@latest add sonner`

```typescript
// lib/hooks/use-toast-action.ts
import { toast } from "sonner"

export function useToastAction() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
  }
}
```

#### Toast Examples

| Action | Success | Error |
|--------|---------|-------|
| Scan | "Found 23 repositories" | "Scan failed: Directory not accessible" |
| Assign theme | "Theme assigned to 5 repos" | "Failed to assign theme" |
| Move | "Moved 5 repositories successfully" | "Failed to move repo-name – disk full?" |
| Settings save | "Settings saved" | "Failed to save settings" |

#### Provider Setup

```typescript
// app/providers.tsx
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </SessionProvider>
  )
}
```

### Action Result Pattern

```typescript
// lib/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

// Example usage in Server Action
export async function triggerScan(): Promise<ActionResult<ScanResults>> {
  try {
    const results = await scanAllConfiguredDirs()
    return {
      success: true,
      data: results,
      message: `Found ${results.newRepos} new repositories`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Scan failed"
    }
  }
}

// Client usage
const result = await triggerScan()
if (result.success) {
  toast.success(result.message)
} else {
  toast.error(result.error)
}
```

---

## Testing Strategy

### Unit Tests

**Framework**: Vitest (fast, ESM-native, works well with Next.js)

```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

#### Test Files Structure

```
__tests__/
├── lib/
│   ├── utils/
│   │   ├── path.test.ts       # Path normalization
│   │   └── git.test.ts        # Git utilities (mocked fs)
│   └── services/
│       ├── scanner.test.ts    # Scanner with mocked fs
│       └── suggester.test.ts  # Theme suggestion heuristics
└── components/
    └── repos/
        └── RepoTable.test.tsx # Component tests
```

#### Scanner Tests (Mock FS)

```typescript
// __tests__/lib/services/scanner.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanDirectory } from '@/lib/services/scanner'
import * as fs from 'fs/promises'

vi.mock('fs/promises')

describe('scanDirectory', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('finds git repositories', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'repo1', isDirectory: () => true },
      { name: 'repo2', isDirectory: () => true },
    ] as any)

    vi.mocked(fs.access).mockImplementation(async (path) => {
      if (String(path).includes('.git')) return undefined
      throw new Error('Not found')
    })

    const results = await scanDirectory('E:\\Projects')
    expect(results).toHaveLength(2)
  })

  it('handles permission errors gracefully', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('EACCES'))

    const results = await scanDirectory('E:\\Protected')
    expect(results).toEqual([])
  })
})
```

#### Path Utils Tests

```typescript
// __tests__/lib/utils/path.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeWindowsPath, isWslPath, joinPaths } from '@/lib/utils/path'

describe('path utilities', () => {
  it('normalizes Windows paths', () => {
    expect(normalizeWindowsPath('C:\\Users\\dev')).toBe('C:/Users/dev')
    expect(normalizeWindowsPath('C:/Users/dev')).toBe('C:/Users/dev')
  })

  it('detects WSL paths', () => {
    expect(isWslPath('\\\\wsl$\\Ubuntu\\home')).toBe(true)
    expect(isWslPath('/mnt/c/Users')).toBe(true)
    expect(isWslPath('C:\\Users')).toBe(false)
  })

  it('joins paths correctly', () => {
    expect(joinPaths('D:/Codebase', 'nextjs', 'my-app')).toBe('D:/Codebase/nextjs/my-app')
  })
})
```

#### Suggester Heuristics Tests

```typescript
// __tests__/lib/services/suggester.test.ts
import { describe, it, expect } from 'vitest'
import { suggestTheme } from '@/lib/services/suggester'

describe('suggestTheme', () => {
  it('suggests nextjs for Next.js projects', () => {
    const packageJson = { dependencies: { next: '14.0.0', react: '18.0.0' } }
    expect(suggestTheme({ packageJson })).toBe('nextjs')
  })

  it('suggests python for Python projects', () => {
    const files = ['requirements.txt', 'main.py']
    expect(suggestTheme({ files })).toBe('python')
  })

  it('returns unclassified when no match', () => {
    expect(suggestTheme({})).toBe('unclassified')
  })
})
```

### E2E Tests

**Framework**: Playwright (fast, reliable, great DX)

```bash
npm install -D @playwright/test
npx playwright install
```

#### E2E Test Structure

```
e2e/
├── setup/
│   └── auth.setup.ts      # GitHub OAuth mock/fixture
├── flows/
│   ├── onboarding.spec.ts # First-time user flow
│   ├── scan-assign.spec.ts # Scan → List → Assign
│   └── triage-move.spec.ts # Preview → Move
└── playwright.config.ts
```

#### Core Flow Test

```typescript
// e2e/flows/scan-assign.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Scan → Assign Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume authenticated (via auth.setup.ts)
    await page.goto('/dashboard/settings')

    // Setup: Add scan directory
    await page.fill('[data-testid="scan-dir-input"]', 'E:\\TestProjects')
    await page.click('[data-testid="add-scan-dir"]')
  })

  test('scans and displays repositories', async ({ page }) => {
    await page.goto('/dashboard/repos')
    await page.click('[data-testid="scan-button"]')

    // Wait for scan to complete
    await expect(page.getByText('Found')).toBeVisible({ timeout: 30000 })

    // Verify repos appear in table
    await expect(page.locator('[data-testid="repo-row"]')).toHaveCount.greaterThan(0)
  })

  test('assigns theme to repository', async ({ page }) => {
    await page.goto('/dashboard/repos')

    // Click theme selector on first repo
    await page.locator('[data-testid="repo-row"]').first()
      .locator('[data-testid="theme-selector"]').click()

    // Select theme
    await page.click('[data-testid="theme-option-nextjs"]')

    // Verify toast
    await expect(page.getByText('Theme assigned')).toBeVisible()
  })
})
```

#### Triage Flow Test

```typescript
// e2e/flows/triage-move.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Triage → Move Flow', () => {
  test('previews and executes moves safely', async ({ page }) => {
    await page.goto('/dashboard/triage')

    // Select repos for triage
    await page.click('[data-testid="select-all-pending"]')

    // Generate preview
    await page.click('[data-testid="preview-moves"]')

    // Verify preview appears
    await expect(page.locator('[data-testid="move-preview"]')).toBeVisible()

    // Check for warnings
    const warnings = page.locator('[data-testid="move-warning"]')

    // Confirm and execute
    await page.click('[data-testid="confirm-moves"]')
    await page.click('[data-testid="execute-moves"]')

    // Verify success
    await expect(page.getByText('Moved')).toBeVisible()
  })
})
```

### Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Performance & Scale Notes

### Known Limitations

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| >1,000 repos | Scan may take 30s+ | Progress indicator, incremental scan (v2) |
| >5,000 repos | UI may lag | Virtualized table, pagination |
| Large repos (>1GB) | Move operations slow | Progress bar, background processing |
| HDD organization root | Move operations very slow | Recommend SSD in settings |
| WSL paths | ~2-3x slower fs access | Recommend native Windows paths when possible |

### Performance Recommendations

#### Scanning

```typescript
// lib/services/scanner.ts
const SCAN_BATCH_SIZE = 100
const SCAN_TIMEOUT_MS = 60000 // 1 minute max

export async function scanWithProgress(
  directories: string[],
  onProgress: (current: number, total: number) => void
): Promise<RepoScanResult[]> {
  // Implementation with batching and progress callbacks
}
```

#### UI Warning for Large Collections

```typescript
// components/repos/RepoTable.tsx
function RepoTable({ repos }: { repos: Repository[] }) {
  const showPerformanceWarning = repos.length > 1000

  return (
    <>
      {showPerformanceWarning && (
        <Alert variant="warning">
          <AlertTitle>Large collection detected</AlertTitle>
          <AlertDescription>
            You have {repos.length} repositories. Consider using filters
            to improve performance. Future versions will support pagination.
          </AlertDescription>
        </Alert>
      )}
      {/* Table implementation */}
    </>
  )
}
```

#### Settings Recommendations

```typescript
// components/settings/SettingsForm.tsx
function OrganizationRootInput({ value, onChange }) {
  const [driveType, setDriveType] = useState<'unknown' | 'ssd' | 'hdd'>('unknown')

  // Check drive type (Windows-specific)
  useEffect(() => {
    checkDriveType(value).then(setDriveType)
  }, [value])

  return (
    <>
      <Input value={value} onChange={onChange} />
      {driveType === 'hdd' && (
        <p className="text-sm text-amber-600 mt-1">
          ⚠️ HDD detected. For better performance, consider using an SSD
          for your organization root.
        </p>
      )}
    </>
  )
}
```

### Future Performance Improvements (v2)

- [ ] Incremental scanning (only check modified directories)
- [ ] Pagination for repo list (50 per page)
- [ ] Virtual scrolling for large tables
- [ ] Background scan with notifications
- [ ] Caching of GitHub API responses
- [ ] Debounced search input

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Deployment** | Local/self-hosted | File system access required |
| **Mutations** | Server Actions | Less boilerplate than API routes |
| **UI Framework** | shadcn/ui | Modern, accessible components |
| **Organization Root** | Single directory | Simpler management |
| **Backup Format** | Git bundle | Native, smaller, full history |
| **File Moves** | Preview + Manual Execute | Safety first |
| **Testing** | Vitest + Playwright | Fast unit tests, reliable E2E |
| **Notifications** | Sonner (toast) | Clean UX, shadcn-compatible |

---

## Implementation Phases (Re-ordered for Fast Feedback Loop)

### Goal: Get to "Scan → List → Assign" loop ASAP

```
Phase 1: Foundation       → Types, utils, Server Actions setup
Phase 1b: Error Handling  → error.tsx, not-found.tsx, toast setup
Phase 2: Scan Engine      → Detect repos immediately
Phase 3: Repo List        → See what was found
Phase 4: Quick Assign     → Assign themes (no move yet)
Phase 5: Settings         → Configure paths & themes + onboarding
Phase 6: Triage Preview   → Preview moves with dry-run
Phase 7: Safe Move        → Execute with confirmation
Phase 8: Dashboard        → Stats & overview
Phase 9: GitHub Sync      → Remote integration
Phase 10: Search/Backup   → Polish features
Phase 11: Testing         → Unit + E2E test suite
```

---

## Phase 1: Foundation (Server Actions + Types)

### 1.1 Shared Types
```typescript
// lib/types.ts
export type TriageStatus = 'pending' | 'manual' | 'auto' | 'ignored'

export interface RepoScanResult {
  name: string
  path: string
  remoteUrl: string | null
  lastCommitSha: string | null
  isDirty: boolean
}

export interface MovePreview {
  repoId: number
  from: string
  to: string
  theme: string
  conflicts: string[]
  warnings: string[]
}

export interface MoveResult {
  success: boolean
  repoId: number
  error?: string
}

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

// Zod Schemas for validation
import { z } from 'zod'

export const settingsSchema = z.object({
  organizationRoot: z.string().min(3).refine(
    (p) => !isSystemPath(p),
    { message: 'Cannot use system directories' }
  ),
})

export const themeSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export const scanDirSchema = z.object({
  path: z.string().min(3),
  isWsl: z.boolean(),
})
```

### 1.2 Path Utilities
```typescript
// lib/utils/path.ts
- normalizeWindowsPath(path: string): string
- normalizeWslPath(path: string): string
- isWslPath(path: string): boolean
- joinPaths(...parts: string[]): string
- isInsideAllowedRoot(path: string, root: string): boolean  // Security: prevent traversal
- isSystemPath(path: string): boolean  // Block C:/Windows, /etc, etc.
```

### 1.3 Git Utilities
```typescript
// lib/utils/git.ts
- getRemoteUrl(repoPath: string): Promise<string | null>
- getLastCommitSha(repoPath: string): Promise<string | null>
- isRepoDirty(repoPath: string): Promise<boolean>
- findGitRepos(directory: string): AsyncGenerator<string>
```

### 1.4 Server Actions Structure
```
lib/actions/
├── repositories.ts    # CRUD repos
├── scan.ts           # Trigger scans
├── themes.ts         # Manage themes
├── settings.ts       # App settings
├── triage.ts         # Preview & execute moves
└── index.ts          # Re-exports
```

**Files to create**:
- `lib/types.ts`
- `lib/utils/path.ts`
- `lib/utils/git.ts`
- `lib/actions/repositories.ts`
- `lib/actions/scan.ts`
- `lib/actions/themes.ts`
- `lib/actions/settings.ts`
- `lib/actions/triage.ts`

---

## Phase 1b: Error Handling Setup

**Files to create**:
- `app/error.tsx`
- `app/not-found.tsx`
- `app/dashboard/error.tsx`
- `app/dashboard/loading.tsx`
- Update `app/providers.tsx` with Toaster

**Dependencies**:
```bash
npx shadcn@latest add sonner
```

---

## Phase 2: Scan Engine

### 2.1 Scan Service
```typescript
// lib/services/scanner.ts
export async function scanDirectory(path: string): Promise<RepoScanResult[]>
export async function scanAllConfiguredDirs(): Promise<RepoScanResult[]>
```

**Logic**:
1. Recursively find `.git` folders
2. For each: extract name, remote URL, SHA, dirty status
3. Return results (don't persist yet)

### 2.2 Scan Action
```typescript
// lib/actions/scan.ts
"use server"

export async function triggerScan(): Promise<ActionResult<{
  newRepos: number
  updatedRepos: number
  totalScanned: number
}>>
```

**Behavior**:
- Reads scan directories from Settings
- Runs scanner
- Upserts to Repository table (match by `originalPath`)
- New repos get `triageStatus: 'pending'`

### 2.3 Minimal Scan UI
Add "Scan Now" button to dashboard layout header for immediate testing.

---

## Phase 3: Repository List Page

### 3.1 Repos Page
```
app/dashboard/repos/page.tsx
```

**Features**:
- Server Component fetching repos
- Table with: Name, Path, Theme, Status, Dirty indicator
- Filters: All / Pending / Organized / Ignored
- "Scan Now" button

### 3.2 Components
```
components/repos/
├── RepoTable.tsx         # Data table
├── RepoRow.tsx           # Single row
├── RepoFilters.tsx       # Filter tabs
└── ScanButton.tsx        # Trigger scan action
```

**At this point**: User can scan and see repos listed. Fast feedback!

---

## Phase 4: Quick Theme Assignment

### 4.1 Inline Theme Assignment
Add theme selector dropdown directly in repo table rows.

```typescript
// lib/actions/repositories.ts
"use server"

export async function assignTheme(repoId: number, theme: string): Promise<ActionResult>
export async function bulkAssignTheme(repoIds: number[], theme: string): Promise<ActionResult>
```

**Behavior**:
- Updates `theme` field in DB
- Does NOT move files yet
- Changes `triageStatus` to `'manual'`

### 4.2 Components
```
components/repos/
└── ThemeSelector.tsx     # Dropdown with theme options
```

**At this point**: User can scan → see repos → assign themes (metadata only).

---

## Phase 5: Settings Page + Onboarding

### 5.1 Settings Page
```
app/dashboard/settings/page.tsx
```

**Sections**:
1. **Organization Root**: Single path input for `D:\Codebase\themes`
2. **Scan Directories**: List with add/remove, WSL toggle
3. **Themes**: CRUD list with name, color, description
4. **Preferences**: Auto-triage toggle (locked to OFF initially)

### 5.2 Onboarding Mode
When `?onboarding=true`, show wizard UI:
- Step indicator
- Required field validation
- Auto-trigger scan on completion

### 5.3 Server Actions
```typescript
// lib/actions/settings.ts
"use server"

export async function getSettings(): Promise<Settings | null>
export async function updateSettings(data: Partial<Settings>): Promise<ActionResult>
export async function addScanDirectory(path: string, isWsl: boolean): Promise<ActionResult>
export async function removeScanDirectory(id: number): Promise<ActionResult>
export async function isSetupComplete(): Promise<boolean>
```

```typescript
// lib/actions/themes.ts
"use server"

export async function getThemes(): Promise<Theme[]>
export async function createTheme(data: { name: string; color?: string }): Promise<ActionResult<Theme>>
export async function updateTheme(id: number, data: Partial<Theme>): Promise<ActionResult>
export async function deleteTheme(id: number): Promise<ActionResult>
export async function createDefaultThemes(): Promise<ActionResult>
```

### 5.4 Components
```
components/settings/
├── SettingsForm.tsx
├── ScanDirectoryList.tsx
├── ThemeManager.tsx
├── PathInput.tsx
├── OnboardingWizard.tsx
├── SetupProgress.tsx
└── DefaultThemesPrompt.tsx
```

---

## Phase 6: Triage Preview (Dry-Run)

### 6.1 Triage Page
```
app/dashboard/triage/page.tsx
```

**Flow**:
1. Load repos with assigned themes but `physicalPath === null`
2. Generate **preview** of proposed moves
3. Show warnings: dirty repos, path conflicts, cross-drive moves
4. User reviews and confirms selection

### 6.2 Preview Action
```typescript
// lib/actions/triage.ts
"use server"

export async function generateMovePreview(repoIds: number[]): Promise<ActionResult<MovePreview[]>>
```

**Preview includes**:
- Source path (`originalPath`)
- Target path (`organizationRoot/theme/repoName`)
- Conflict detection (folder already exists → suggest `-2` suffix)
- Warnings (dirty repo, cross-drive, long path)

### 6.3 Components
```
components/triage/
├── TriageList.tsx        # List of pending repos
├── MovePreviewCard.tsx   # Single move preview
├── PreviewTable.tsx      # Batch preview
├── WarningBadge.tsx      # Dirty/conflict warnings
└── ConfirmDialog.tsx     # Final confirmation
```

---

## Phase 7: Safe Move Execution

### 7.1 Move Service
```typescript
// lib/services/mover.ts

export interface MoveOptions {
  createBackup: boolean
  handleConflicts: 'suffix' | 'skip' | 'fail'
}

export async function moveRepository(
  repoId: number,
  targetPath: string,
  options: MoveOptions
): Promise<MoveResult>

export async function batchMoveRepositories(
  moves: Array<{ repoId: number; targetPath: string }>,
  options: MoveOptions
): Promise<MoveResult[]>
```

**Safety measures**:
1. **Pre-check**: Verify source exists, target doesn't (or handle conflict)
2. **Backup**: Optional temp copy before move
3. **Move**: `fs.rename` (same drive) or copy+delete (cross-drive)
4. **Update DB**: Set `physicalPath`, update `triageStatus`
5. **Log**: Record operation for undo capability

### 7.2 Move Action
```typescript
// lib/actions/triage.ts
"use server"

export async function executeMoves(
  moves: MovePreview[],
  options: MoveOptions
): Promise<ActionResult<{
  successful: number
  failed: number
  results: MoveResult[]
}>>
```

### 7.3 Progress UI
```
components/triage/
└── MoveProgress.tsx      # Progress bar + results
```

**At this point**: Full triage loop complete!

---

## Phase 8: Dashboard Overview

### 8.1 Overview Page
```
app/dashboard/page.tsx
```

**Stats Cards**:
- Total repositories
- Pending triage (not assigned)
- Assigned but not moved
- Organized (moved to theme folder)
- Dirty repos (need attention)

**Quick Actions**:
- "Scan Now" button
- "Go to Triage" button
- "View Pending" filter shortcut

### 8.2 Components
```
components/dashboard/
├── StatsCard.tsx
├── QuickActions.tsx
└── RecentActivity.tsx    # Optional: last operations log
```

---

## Phase 9: GitHub Sync (Basic)

### 9.1 Sync Service
```typescript
// lib/services/github-sync.ts

export async function fetchGitHubRepoInfo(
  remoteUrl: string,
  accessToken: string
): Promise<GitHubRepoInfo | null>

export async function checkSyncStatus(repoId: number): Promise<SyncStatus>
```

### 9.2 Sync Actions
```typescript
// lib/actions/sync.ts
"use server"

export async function syncRepository(repoId: number): Promise<ActionResult>
export async function checkAllSyncStatus(): Promise<ActionResult<SyncStatusMap>>
```

**Features**:
- Compare local SHA with GitHub
- Display sync indicators (ahead/behind/synced)
- Manual pull trigger (future: auto-pull option)

---

## Phase 10: Search & Backup

### 10.1 Search
- Install `fuse.js`
- Add search bar to repo list
- Fuzzy search: name, path, theme, remote URL

### 10.2 Backup
```typescript
// lib/services/backup.ts

export async function createGitBundle(repoPath: string, outputPath: string): Promise<void>
export async function backupTheme(theme: string, outputDir: string): Promise<void>
export async function backupAll(outputDir: string): Promise<void>
```

---

## Phase 11: Testing

### 11.1 Unit Tests Setup
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

### 11.2 E2E Tests Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### 11.3 Test Coverage Targets

| Area | Coverage Target |
|------|-----------------|
| Path utilities | 100% |
| Git utilities | 90% |
| Scanner service | 80% |
| Suggester heuristics | 100% |
| Server Actions | 70% |
| E2E critical paths | 100% |

---

## Final File Structure

```
app/
├── error.tsx              # Global error boundary
├── not-found.tsx          # 404 page
├── dashboard/
│   ├── layout.tsx
│   ├── error.tsx          # Dashboard error boundary
│   ├── loading.tsx        # Loading state
│   ├── page.tsx           # Overview
│   ├── repos/page.tsx     # Repository list
│   ├── triage/page.tsx    # Triage wizard
│   └── settings/page.tsx  # Configuration + onboarding
├── page.tsx               # Landing/login
├── layout.tsx
├── providers.tsx          # SessionProvider + Toaster
└── globals.css

components/
├── ui/                    # shadcn components
├── dashboard/
├── repos/
├── triage/
└── settings/

lib/
├── prisma.ts
├── types.ts
├── utils/
│   ├── path.ts
│   └── git.ts
├── services/
│   ├── scanner.ts
│   ├── suggester.ts
│   ├── mover.ts
│   ├── github-sync.ts
│   └── backup.ts
└── actions/
    ├── repositories.ts
    ├── scan.ts
    ├── themes.ts
    ├── settings.ts
    ├── triage.ts
    └── sync.ts

__tests__/
├── lib/
│   ├── utils/
│   └── services/
└── components/

e2e/
├── setup/
├── flows/
└── playwright.config.ts
```

---

## Dependencies

```bash
# UI (shadcn/ui)
npx shadcn@latest init
npx shadcn@latest add button card input label table dialog select badge tabs alert sonner

# Icons
npm install lucide-react

# Validation
npm install zod

# Git operations
npm install simple-git

# Search
npm install fuse.js

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @playwright/test
```

---

## Verification Plan

### Phase-by-Phase Testing

| Phase | Test |
|-------|------|
| 1b | Error pages render, toasts work |
| 2 | Run scan → check console output |
| 3 | View `/dashboard/repos` → see scanned repos |
| 4 | Assign theme → verify DB + toast |
| 5 | Onboarding flow → forced redirect works |
| 6 | Generate preview → verify paths calculated |
| 7 | Execute move → verify files moved + DB updated |
| 8 | Dashboard → verify stats match reality |
| 11 | `npm test` passes, E2E flows complete |

### End-to-End Scenario
1. Sign in with GitHub
2. **Auto-redirect to /settings** (first-time user)
3. Set organization root: `D:\Codebase\organized`
4. Add scan directory: `E:\Projects`
5. Accept default themes
6. **Auto-scan triggers**
7. Redirect to repos page → see results
8. Assign themes to repos
9. Triage → Preview → Execute moves
10. Verify: Files moved to `D:\Codebase\organized/{theme}/{repo}`
11. Dashboard → Verify stats

---

## Safety Checklist

- [ ] No auto-moves without explicit user confirmation
- [ ] Dry-run preview before any file operation
- [ ] Dirty repo warning before move
- [ ] Cross-drive move handled correctly (copy+delete)
- [ ] Conflict resolution with suffix naming
- [ ] Operation logging for audit/undo
- [ ] WSL path normalization tested
- [ ] Error boundaries catch failures gracefully
- [ ] Toast notifications for all action results
- [ ] Large collection warning (>1,000 repos)

---

## Out of Scope (v1)

- Multi-user support
- Other VCS (GitLab, Bitbucket)
- Advanced LLM chat
- Mobile app
- Cloud deployment
- Auto-move mode (future v2 with strict safeguards)
- Incremental scanning
- Pagination (v2)
