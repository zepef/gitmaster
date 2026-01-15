# PLAN-002: Codebase Hub Implementation Plan (Revised)

**Based on**: PRD-001.md v1.1 + Review Feedback
**Date**: January 15, 2026
**Status**: Draft for validation

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

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Deployment** | Local/self-hosted | File system access required |
| **Mutations** | Server Actions | Less boilerplate than API routes |
| **UI Framework** | shadcn/ui | Modern, accessible components |
| **Organization Root** | Single directory | Simpler management |
| **Backup Format** | Git bundle | Native, smaller, full history |
| **File Moves** | Preview + Manual Execute | Safety first |

---

## Implementation Phases (Re-ordered for Fast Feedback Loop)

### Goal: Get to "Scan → List → Assign" loop ASAP

```
Phase 1: Foundation       → Types, utils, Server Actions setup
Phase 2: Scan Engine      → Detect repos immediately
Phase 3: Repo List        → See what was found
Phase 4: Quick Assign     → Assign themes (no move yet)
Phase 5: Settings         → Configure paths & themes
Phase 6: Triage Preview   → Preview moves with dry-run
Phase 7: Safe Move        → Execute with confirmation
Phase 8: Dashboard        → Stats & overview
Phase 9: GitHub Sync      → Remote integration
Phase 10: Search/Backup   → Polish features
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
```

### 1.2 Path Utilities
```typescript
// lib/utils/path.ts
- normalizeWindowsPath(path: string): string
- normalizeWslPath(path: string): string
- isWslPath(path: string): boolean
- joinPaths(...parts: string[]): string
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

export async function triggerScan(): Promise<{
  newRepos: number
  updatedRepos: number
  totalScanned: number
}>
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

export async function assignTheme(repoId: number, theme: string): Promise<void>
export async function bulkAssignTheme(repoIds: number[], theme: string): Promise<void>
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

## Phase 5: Settings Page

### 5.1 Settings Page
```
app/dashboard/settings/page.tsx
```

**Sections**:
1. **Organization Root**: Single path input for `D:\Codebase\themes`
2. **Scan Directories**: List with add/remove, WSL toggle
3. **Themes**: CRUD list with name, color, description
4. **Preferences**: Auto-triage toggle (locked to OFF initially)

### 5.2 Server Actions
```typescript
// lib/actions/settings.ts
"use server"

export async function getSettings(): Promise<Settings>
export async function updateSettings(data: Partial<Settings>): Promise<void>
export async function addScanDirectory(path: string, isWsl: boolean): Promise<void>
export async function removeScanDirectory(id: number): Promise<void>
```

```typescript
// lib/actions/themes.ts
"use server"

export async function getThemes(): Promise<Theme[]>
export async function createTheme(data: { name: string; color?: string }): Promise<Theme>
export async function updateTheme(id: number, data: Partial<Theme>): Promise<void>
export async function deleteTheme(id: number): Promise<void>
```

### 5.3 Components
```
components/settings/
├── SettingsForm.tsx
├── ScanDirectoryList.tsx
├── ThemeManager.tsx
└── PathInput.tsx         # With folder picker hint
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

export async function generateMovePreview(repoIds: number[]): Promise<MovePreview[]>
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
): Promise<{
  successful: number
  failed: number
  results: MoveResult[]
}>
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

export async function syncRepository(repoId: number): Promise<void>
export async function checkAllSyncStatus(): Promise<SyncStatusMap>
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

## Final File Structure

```
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx           # Overview
│   ├── repos/page.tsx     # Repository list
│   ├── triage/page.tsx    # Triage wizard
│   └── settings/page.tsx  # Configuration
├── page.tsx               # Landing/login
├── layout.tsx
├── providers.tsx
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
```

---

## Dependencies

```bash
# UI (shadcn/ui)
npx shadcn@latest init
npx shadcn@latest add button card input label table dialog select badge tabs alert

# Git operations
npm install simple-git

# Search
npm install fuse.js
```

---

## Verification Plan

### Phase-by-Phase Testing

| Phase | Test |
|-------|------|
| 2 | Run scan → check console output |
| 3 | View `/dashboard/repos` → see scanned repos |
| 4 | Assign theme → verify DB update (Prisma Studio) |
| 5 | Add scan dir + theme → verify persistence |
| 6 | Generate preview → verify paths calculated correctly |
| 7 | Execute move → verify files moved + DB updated |
| 8 | Dashboard → verify stats match reality |

### End-to-End Scenario
1. Sign in with GitHub
2. Settings → Add scan directory (`E:\Projects`)
3. Settings → Create themes: `nextjs`, `python`, `experiments`
4. Settings → Set organization root: `D:\Codebase\organized`
5. Repos → Click "Scan Now"
6. Repos → Assign themes to repos
7. Triage → Generate preview
8. Triage → Confirm and execute moves
9. Verify: Files moved to `D:\Codebase\organized/{theme}/{repo}`
10. Dashboard → Verify stats

---

## Safety Checklist

- [ ] No auto-moves without explicit user confirmation
- [ ] Dry-run preview before any file operation
- [ ] Dirty repo warning before move
- [ ] Cross-drive move handled correctly (copy+delete)
- [ ] Conflict resolution with suffix naming
- [ ] Operation logging for audit/undo
- [ ] WSL path normalization tested

---

## Out of Scope (v1)

- Multi-user support
- Other VCS (GitLab, Bitbucket)
- Advanced LLM chat
- Mobile app
- Cloud deployment
- Auto-move mode (future v2 with strict safeguards)
