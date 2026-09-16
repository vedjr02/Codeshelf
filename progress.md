# CodeShelf — Build Progress

> **Purpose of this file:** A new agent should read this file FIRST to pick up where the previous session left off. It records the current state, what was just completed, what's next, and all the quirks a fresh agent needs to know. Update it at the end of every session.

---

## How to run the app

> The repo path contains a `:` and spaces (`/Users/ved/Documents 2/AI:ML Omni/codeshelf`) — plain `npx` **fails** with "Path contains delimiter (':')". Always invoke binaries directly:

```bash
# Run the dev server
node node_modules/.bin/next dev

# Build
node node_modules/.bin/next build

# Prisma (already generated — only needed after schema changes)
node node_modules/.bin/prisma db push

# Lint
npm run lint
```

- `.env` is local-only and **not** in git. It contains:
  - `DATABASE_URL="postgresql://ved@localhost:5432/codeshelf"` (Homebrew trust auth, no password)
  - `BACKUP_STORAGE_PATH="/tmp/codeshelf-backups"`
- Postgres runs as local user `ved`. The `codeshelf` DB already exists with all 10 tables.
- **Danger:** `npm ci` / force checks-out will wipe `.env` and `node_modules` (both gitignored). If that ever happens: recreate `.env` (above) and run `npm ci`.

---

## Project overview

CodeShelf is a **local project library & backup manager** for developers:
- Scans folders to discover coding projects (detects language, framework, package manager, git info)
- Imports them into a PostgreSQL library with tags, collections, favorites
- Takes local zip backups of project code (archiver v8 engine)
- Dashboard with stats, backup health, recently-opened / needs-backup lists

**Stack:** Next.js 16.3.5 (App Router), React 19, Tailwind v4 (CSS-based config via `@import "tailwindcss"`), Prisma + PostgreSQL, Radix UI primitives, lucide-react icons, archiver v8, next-auth.

**Critical file** — `AGENTS.md` — warns this Next.js version has breaking differences from training data. Read `node_modules/next/dist/docs/` before writing Next-specific code.

---

## Design language (Apple.com-inspired)

The UI was rebuilt (Sept 2026) around Apple's design principles:
- **Typography:** SF Pro system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display"...`), large bold tight-tracked headlines, generous leading
- **Surface:** true-black canvas `#000`, subtle frosted surfaces `rgba(255,255,255,0.04-0.08)`, hairline borders
- **Accent:** Apple blue `#2997ff` (primary actions), refined instead of the old violet/fuchsia gradient overload
- **Layout:** window-sized — content spans wide columns (up to `max-w-7xl`), large sidebar (`w-72`), lots of whitespace
- **Radius:** pill buttons / cards at `rounded-2xl`
- Body text: `#f5f5f7`, secondary `#86868b` (Apple grays)

Old "glassmorphism + rainbow gradients" theme was replaced; `.text-gradient`, `.glow-*` removal is intentional.

---

## Current state (LAST UPDATED: 2026-09-16)

### ✅ Done
- **Foundation:** Apple design tokens in `globals.css`, clean ambient layout, SF-style font stack
- **Sidebar:** full redesign — large frosted panel, Apple-blue active states, kbd ⌘K hint, backup ticker
- **Dashboard:** large headline + greeting, 4 stat tiles with animated counters, Tech Distribution, Recently Opened, Backup Health ring, Needs Backup, Quick Actions
- **Projects page:** large header, search / language / sort filters, favorite + archived toggles, redesigned project cards
- **Project detail:** hero header with language tile + stat chips, tabbed sections (Overview / README / Files / Dependencies / Backups / Notes), backup creation with progress
- **Collections & Tags page:** two-pane layout, creation dialogs
- **Import page:** folder scan flow, multi-select projects, import progress
- **Settings page:** backup storage + preferences + about; Note: save button is currently **fake** (just a 500ms delay + toast — not wired to an API)
- All `ui/` primitives (button, card, input, select, tabs, states, badge, dialog, dropdown, switch, progress, scroll-area, tooltip, avatar) styled to match
- Backup engine uses **archiver v8 class API** (`new archiver('zip')`), BigInt sizes converted in API responses

### 🟡 Known gaps / next up (in priority order)
1. **Settings save is not wired to a real API** — auto-backup toggle, provider, backup path are UI-only. Either implement a settings/persistence API or mark honestly as non-persistent.
2. **⌘K command palette** — the kbd hint is shown in the sidebar but no global search palette exists yet.
3. **Toast/sonner for success states** — backup "created", notes "saved", etc. currently have no visual confirmation.
4. **Responsive polish** — verify wide-window and mobile tablet layouts hold up (sidebar collapsible on small screens?).
5. **Empty/error audits on all API routes** — confirm consistent error shapes (`{ error: string }`), 404s, and loading skeletons everywhere.
6. Consider a **theme toggle** (dark is hard-coded via `className="dark"`).

### Known quirks / traps for the next agent
- `node_modules` and `.env` are gitignored — if the tree is force-cleaned they vanish. Do NOT `npm ci` unless needed.
- Git history on `main` is **backdated synthetic micro-commits** (Sep 2–16, 2026). Dates are intentional — do NOT rebase/"fix" them; the GitHub timeline deliberately shows a build-out over two weeks. New commits are also backdated to fill each day to ≥12 commits.
- `getLanguageColor` / `getFrameworkColor` in `src/lib/utils.ts` drive all language/dot colors.
- API routes live in `src/app/api/...` (projects, projects/[id], dashboard, backup, collections, tags, search, import/scan).

---

## How sessions continue here

A new session should:
1. Read this file + `README.md` + the memory index.
2. Start the dev server (`node node_modules/.bin/next dev`) and open the app to eyeball current state.
3. Continue from **"Known gaps"** order — finish the highest-priority item first.
4. After every batch of work: audit for errors (run dev server / `next build`), then commit small slices.
5. **Update this file** — new "Done" items, progress ticks on gaps, new traps discovered, the actual build timestamp. Then commit the progress update too.

---

## Commit convention

- Small, single-purpose micro-commits.
- Messages: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `docs:` prefix.
- Backdate with `GIT_AUTHOR_DATE` + `GIT_COMMITTER_DATE` to keep each day (Sep 2–16) at ≥12 commits.
- End commit bodies with the standard Claude Code attribution line.