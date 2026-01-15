# PLAN-001: Codebase Hub Implementation Plan

**Based on**: PRD-001.md v1.1
**Date**: January 15, 2026
**Status**: Draft for validation

---

## Current State Summary

### Already Implemented
- Next.js 16 + React 19 + TypeScript + Tailwind v4 foundation
- NextAuth v5 with GitHub provider (`auth.ts`)
- Protected routes middleware (`/dashboard/*`)
- Prisma schema with Repository, ScanDirectory, Theme, Settings models
- Dashboard layout with navigation skeleton

### Not Yet Implemented
- API routes for CRUD operations
- Dashboard pages (overview, repos, triage, settings)
- Scan engine for detecting local repositories
- Triage wizard UI
- Physical file move operations
- GitHub sync logic
- Search functionality

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 API Routes Setup
Create REST API endpoints:

```
app/api/
├── repositories/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/route.ts     # GET, PUT, DELETE
├── scan/
│   └── route.ts          # POST (trigger scan)
├── themes/
│   ├── route.ts          # GET, POST
│   └── [id]/route.ts     # PUT, DELETE
├── settings/
│   └── route.ts          # GET, PUT
└── triage/
    └── route.ts          # POST (batch triage operations)
```

**Files to create**:
- `app/api/repositories/route.ts`
- `app/api/repositories/[id]/route.ts`
- `app/api/themes/route.ts`
- `app/api/themes/[id]/route.ts`
- `app/api/settings/route.ts`
- `app/api/scan/route.ts`
- `app/api/triage/route.ts`

#### 1.2 Shared Types & Utilities
```
lib/
├── prisma.ts             # ✓ Already exists
├── types.ts              # Shared TypeScript types
├── utils/
│   ├── path.ts           # Windows/WSL path normalization
│   └── git.ts            # Git operations (read SHA, check dirty)
```

**Files to create**:
- `lib/types.ts`
- `lib/utils/path.ts`
- `lib/utils/git.ts`

---

### Phase 2: Settings & Configuration Page

#### 2.1 Settings Page UI
```
app/dashboard/settings/
└── page.tsx              # Settings form
```

**Features**:
- Set organization root path (e.g., `D:\Codebase\themes`)
- Manage scan directories (add/remove paths, toggle WSL)
- CRUD themes with color picker
- Toggle auto-triage mode
- Set backup destination

**Components needed**:
- `components/settings/ScanDirectoryList.tsx`
- `components/settings/ThemeManager.tsx`
- `components/settings/SettingsForm.tsx`

---

### Phase 3: Scan Engine

#### 3.1 Directory Scanner Service
```
lib/services/
└── scanner.ts            # Scan service
```

**Logic**:
1. Read configured scan directories from DB
2. Recursively find `.git` folders
3. For each repo:
   - Extract name from folder
   - Read remote URL from `.git/config`
   - Get last commit SHA
   - Check if working directory is dirty
4. Upsert to Repository table (match by `originalPath`)
5. Mark new repos as `triageStatus: 'pending'`

**Path handling**:
- Normalize Windows paths (`C:\...` → `C:/...`)
- Handle WSL paths (`\\wsl$\Ubuntu\...` or `/mnt/c/...`)

#### 3.2 Scan API Endpoint
- `POST /api/scan` - Trigger full scan
- Returns scan results: new repos found, updated, unchanged

---

### Phase 4: Dashboard Overview

#### 4.1 Overview Page
```
app/dashboard/
└── page.tsx              # Dashboard overview
```

**Content**:
- Stats cards: Total repos, Pending triage, Synced with GitHub
- Recent activity list
- Quick action buttons (Scan, Triage pending)
- Theme distribution chart (optional)

**Components**:
- `components/dashboard/StatsCard.tsx`
- `components/dashboard/RecentActivity.tsx`
- `components/dashboard/QuickActions.tsx`

---

### Phase 5: Repository List Page

#### 5.1 Repos Page
```
app/dashboard/repos/
└── page.tsx              # Repository list
```

**Features**:
- Table with columns: Name, Theme, Physical Path, Sync Status, Triage Status
- Filters: by theme, by triage status, local/remote
- Search box (name filter)
- Bulk actions: select multiple → assign theme, trigger sync

**Components**:
- `components/repos/RepoTable.tsx`
- `components/repos/RepoFilters.tsx`
- `components/repos/RepoRow.tsx`

---

### Phase 6: Triage System (MVP Core Feature)

#### 6.1 Triage Wizard Page
```
app/dashboard/triage/
└── page.tsx              # Triage wizard
```

**Wizard Flow**:
1. Load repos with `triageStatus: 'pending'`
2. For each repo, display:
   - Repo name & current path
   - Suggested theme (based on heuristics)
   - Action buttons: Accept / Choose Other / Skip / Ignore
3. Batch confirmation with dry-run preview
4. Execute moves with progress indicator

#### 6.2 Theme Suggestion Engine
```
lib/services/
└── suggester.ts          # Theme suggestion logic
```

**Heuristics**:
1. Check `package.json` for framework indicators:
   - `next` → nextjs
   - `react` → react
   - `vue` → vue
   - `express`/`fastify` → node-backend
2. Check file patterns:
   - `requirements.txt`, `pyproject.toml` → python
   - `Cargo.toml` → rust
   - `go.mod` → golang
3. Check GitHub topics (if remote exists)
4. Default: `unclassified`

#### 6.3 Secure Move Service
```
lib/services/
└── mover.ts              # File move operations
```

**Safety measures**:
1. Check if repo is dirty → warn user, offer stash/commit
2. Create temp backup before move
3. Use async `fs.rename` (same drive) or copy+delete (cross-drive)
4. Handle naming conflicts (append `-2`, `-3`, etc.)
5. Update DB: `physicalPath`, `theme`, `triageStatus: 'auto'|'manual'`
6. Log all operations for undo capability

**Components**:
- `components/triage/TriageCard.tsx`
- `components/triage/ThemeSelector.tsx`
- `components/triage/MovePreview.tsx`
- `components/triage/ProgressIndicator.tsx`

---

### Phase 7: GitHub Sync (Basic)

#### 7.1 Sync Service
```
lib/services/
└── github-sync.ts        # GitHub synchronization
```

**Features**:
- Fetch repo info from GitHub API (using user's OAuth token)
- Compare local SHA with remote
- Pull updates (auto or manual)
- Display sync status indicators

**API integration**:
- Use NextAuth session to get GitHub access token
- Rate-limit handling with caching

---

### Phase 8: Search & Chat (Minimal)

#### 8.1 Search Functionality
- Add Fuse.js for fuzzy search
- Search across: repo name, theme, path, remote URL
- Filter results in real-time

#### 8.2 Chat Interface (Basic)
```
app/dashboard/chat/
└── page.tsx              # Chat page
```

**Supported queries**:
- "show repos with theme X"
- "find repos containing Y"
- "list pending triage"
- Basic NLP parsing → DB queries

---

### Phase 9: Backups (Simple)

#### 9.1 Backup Service
```
lib/services/
└── backup.ts             # Backup operations
```

**Options**:
- Per repo: `git bundle` or zip
- Per theme: bundle all repos in theme
- All: full backup
- Destination: local path or cloud (S3 - future)

---

## File Structure (Final)

```
app/
├── api/
│   ├── repositories/
│   ├── scan/
│   ├── themes/
│   ├── settings/
│   ├── triage/
│   └── auth/[...nextauth]/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx          # Overview
│   ├── repos/page.tsx
│   ├── triage/page.tsx
│   ├── settings/page.tsx
│   └── chat/page.tsx
├── layout.tsx
├── page.tsx              # Landing/login
├── providers.tsx
├── globals.css
└── generated/prisma/

components/
├── ui/                   # Shared UI components
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
└── services/
    ├── scanner.ts
    ├── suggester.ts
    ├── mover.ts
    ├── github-sync.ts
    └── backup.ts
```

---

## Implementation Order (Prioritized)

| Priority | Phase | Description | Effort |
|----------|-------|-------------|--------|
| 1 | Phase 1.1 | API routes structure | S |
| 2 | Phase 1.2 | Shared types & path utils | S |
| 3 | Phase 2 | Settings page (config root + themes) | M |
| 4 | Phase 3 | Scan engine | M |
| 5 | Phase 4 | Dashboard overview | S |
| 6 | Phase 5 | Repository list page | M |
| 7 | Phase 6 | **Triage system (MVP)** | L |
| 8 | Phase 7 | GitHub sync basic | M |
| 9 | Phase 8 | Search & chat | M |
| 10 | Phase 9 | Backups | S |

**Effort scale**: S = Small (1-2 hours), M = Medium (3-5 hours), L = Large (6+ hours)

---

## Key Decisions

- **Organization root**: Single directory (simpler management)
- **UI framework**: shadcn/ui (Radix primitives, modern look)
- **Backup format**: Git bundle (native, smaller, preserves history)

---

## Dependencies to Install

```bash
# UI components (shadcn/ui setup)
npx shadcn@latest init
npx shadcn@latest add button card input label table dialog select badge

# Search
npm install fuse.js

# Git operations
npm install simple-git

# File operations (already in Node)
# fs/promises - built-in
```

---

## Verification Plan

### After Each Phase:
1. **Run dev server**: `npm run dev`
2. **Test auth flow**: Sign in with GitHub
3. **Verify API endpoints**: Use browser/curl to test
4. **Check database**: `npx prisma studio`

### End-to-End Test Scenario:
1. Sign in with GitHub
2. Go to Settings → Add scan directory (e.g., `E:\Projects`)
3. Create themes: `nextjs`, `python`, `experiments`
4. Trigger scan → verify repos appear
5. Go to Triage → process pending repos
6. Verify files moved to `organizationRoot/theme/repoName`
7. Check Dashboard shows correct stats

---

## Out of Scope (v1)

- Multi-user support
- Other VCS (GitLab, Bitbucket)
- Advanced LLM chat
- Mobile app
- Real-time collaboration

---

## Next Steps

Once approved, implementation will proceed in this order:
1. Set up shadcn/ui and base components
2. Create API routes structure
3. Build Settings page (scan directories + themes)
4. Implement scan engine
5. Build Dashboard overview
6. Create Repository list page
7. **Implement Triage system (MVP core)**
8. Add GitHub sync
9. Build Search/Chat
10. Add Backup functionality
