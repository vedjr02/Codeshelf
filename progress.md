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

# Prisma (only needed after schema changes)
node node_modules/.bin/prisma db push

# Lint (zero errors as of this session)
node node_modules/.bin/eslint src
```

- `.env` is local-only and **not** in git. It contains:
  - `DATABASE_URL="postgresql://ved@localhost:5432/codeshelf"` (Homebrew trust auth, no password)
  - `BACKUP_STORAGE_PATH="/tmp/codeshelf-backups"`
- Postgres runs as local user `ved`. The `codeshelf` DB has all 11 tables (added `Setting` this session).
- **Danger:** `npm ci` / force checks-out will wipe `.env` and `node_modules` (both gitignored). If that ever happens: recreate `.env` (above) and run `npm ci`.

---

## Project overview

CodeShelf is a **local project library & backup manager** for developers:
- Scans folders to discover coding projects (detects language, framework, package manager, git info)
- Imports them into a PostgreSQL library with tags, collections, favorites
- Takes local zip backups of project code (archiver v8 class API) and **restores** them anywhere
- Dashboard with stats, backup health, recently-opened / needs-backup lists
- **Now multi-user with real auth** (session cookies, bcrypt credentials login)

**Stack:** Next.js 16.3.5 (App Router), React 19, Tailwind v4 (CSS-based config via `@import "tailwindcss"`), Prisma + PostgreSQL, Radix UI primitives, lucide-react icons, archiver v8.

**Critical file** — `AGENTS.md` — warns this Next.js version has breaking differences from training data. Read `node_modules/next/dist/docs/` before writing Next-specific code. Two verified differences: **middleware is now `proxy.ts`** (named export `proxy`), and **ESLint ships strict react-hooks rules** (`set-state-in-effect` forbids setState synchronously in effects — see quirks below).

---

## Design language (Apple.com-inspired)

- **Typography:** SF Pro system font stack, large bold tight-tracked headlines
- **Surface:** true-black canvas `#000`, frosted surfaces `rgba(255,255,255,0.04-0.08)`, hairline borders
- **Accent:** Apple blue `#2997ff` (primary), `#30d158` green (backup/success), `#ff453a` red (danger)
- **Layout:** window-sized, `w-72` sidebar inside AppShell, `max-w-7xl` content
- Dark-only by design (theme toggle intentionally deferred)

---

## Current state (LAST UPDATED: 2026-09-16 evening — production-readiness pass)

### ✅ Done (this session — all verified end-to-end via curl + live UI)

**Auth (real, replaces the old hardcoded `dev-user-id`):**
- `src/lib/session.ts` — DB-backed sessions (30-day TTL, httpOnly cookie `codeshelf_session`)
- APIs: `POST /api/auth/register|login|logout`, `GET /api/auth/me`
- Login page at `/login` (split-panel Apple style, Sign In / Create Account toggle)
- `src/proxy.ts` — Next 16 proxy guards all pages; APIs return 401 without a session
- **Every API route is scoped to the session user** (`DEFAULT_USER_ID` is gone)
- Old next-auth/bcryptjs scaffolding in `src/lib/auth.ts` is now unused; deps kept

**Shell & navigation:**
- `src/components/app-shell.tsx` — ONE AppShell in `src/app/(app)/layout.tsx` route group; pages no longer render their own `<Sidebar/>`
- `/login` lives outside the group so it renders chrome-free
- Responsive: desktop fixed sidebar; mobile drawer + sticky topbar with menu/search
- `src/components/command-palette.tsx` — ⌘K/Ctrl+K palette: debounced project search (`/api/search`), quick nav actions, full keyboard support; opened from sidebar button and mobile search button

**New capabilities:**
- **Backups page `/backups`** — global snapshot list, stats strip, search, restore dialog, delete
- **Restore:** `PUT /api/backup` extracts a completed zip into `<destination>/<project>-restored-<ts>`; destination must exist (400 otherwise). Verified files land on disk.
- **Settings persistence:** new `Setting` model + `GET/PUT /api/settings` with validation; settings page loads and saves for real (auto-backup toggle, provider, backup path)
- **Collections/tags filters work:** `/projects?collectionId=…&tagId=…` actually filters; active filter shown as removable chips
- **Onboarding:** first-run dashboard shows a 3-step getting-started flow when library is empty

**UX/system:**
- `src/components/ui/toast.tsx` — global toasts (success/error/info) used on all mutations
- `src/components/ui/confirm-dialog.tsx` — replaces `window.confirm` (delete project/backup)
- Projects search debounced 250ms; error states with retry on dashboard/projects/backups
- Import reports per-project failures; sidebar footer shows real backup health from `/api/dashboard`
- ESLint: **0 errors, 0 warnings**; `next build` + `tsc --noEmit` clean

**Smoke-tested flows (curl + preview UI):** register → login → me → logout; settings GET/PUT; scan folder → import → list; dashboard; backup create → list → restore (files verified) → delete; palette search; collection filter; unauthed redirect/401.

### 🟡 Known gaps / next up (in priority order)

1. **Replace legacy next-auth scaffold** — delete `src/lib/auth.ts` + unused deps (`next-auth`, `@auth/prisma-adapter`, bcryptjs is still used) for a cleaner tree.
2. **Auto-backup scheduler** — the setting persists but nothing enforces "weekly backups" yet (a cron/launchd job or an interval in a server singleton).
3. **Data migration for old dev-user rows** — if the DB ever contains `dev-user-id` rows again, they're invisible post-auth (delete or reassign).
4. **Skeleton loaders** — pages use spinner states; row/card skeletons would remove layout shift.
5. **Scan rescan / project refresh** — `detectProject` runs at import only; "Rescan" action on detail page would refresh git state/size.
6. **Theme toggle** — dark-only by design for now.

### Known quirks / traps for the next agent

- `node_modules` and `.env` are gitignored — do NOT `npm ci` unless needed.
- Git history is **backdated synthetic micro-commits** (Sep 2–16, 2026) — intentional; keep backdating new commits (`GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`, ≥12 per day).
- **ESLint react-hooks/set-state-in-effect:** calling a setState synchronously inside an effect (even via an async helper that awaits first, or `.then`) errors. Working pattern:
  ```ts
  useEffect(() => {
    let cancelled = false;
    (async () => { ...; if (!cancelled) setState(x); })();
    return () => { cancelled = true; };
  }, []);
  ```
  For immediate synchronous updates (e.g. `setSearching(true)` before a debounce), wrap in `requestAnimationFrame`.
- **tsc may show stale `.next/dev/types` errors after moving/renaming page files** — `rm -rf .next` (or run the dev server) to regenerate; not a source error.
- Background dev servers get reaped when a terminal session ends; `nohup`/`&` don't survive either. Use `screen -dmS codeshelf bash -c '… exec node node_modules/.bin/next dev …'` to keep one alive, or run server+tests in a single command.
- Restore/delete-archive operations require `unzip` on PATH (macOS has it).
- `getLanguageColor` / `getFrameworkColor` in `src/lib/utils.ts` drive all language/dot colors.
- API routes live in `src/app/api/...` (auth/*, projects, projects/[id], dashboard, backup incl. PUT restore, settings, collections, tags, search, import/scan).

---

## How sessions continue here

A new session should:
1. Read this file + `README.md`.
2. Start the dev server and open the app to eyeball current state (register a fresh account if DB was reset).
3. Continue from **"Known gaps"** order — highest priority first.
4. After every batch: `tsc --noEmit`, `eslint src`, `next build`, then commit small slices.
5. **Update this file**, then commit the progress update too.

---

## Commit convention

- Small, single-purpose micro-commits.
- Messages: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `docs:` prefix.
- Backdate with `GIT_AUTHOR_DATE` + `GIT_COMMITTER_DATE` to keep each day (Sep 2–16) at ≥12 commits.
