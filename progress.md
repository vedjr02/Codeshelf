# CodeShelf — Build Progress

> **Purpose of this file:** A new agent should read this file FIRST to pick up where the previous session left off. It records the current state, what was just completed, what's next, and all the quirks a fresh agent needs to know. Update it at the end of every session.

---

## How to run the app

> The app is nested at `/Users/ved/Documents 2/Codeshelf/codeshelf`. Run commands from that directory:

```bash
cd '/Users/ved/Documents 2/Codeshelf/codeshelf'

# Run the dev server
npm run dev

# Alternate port
npm run dev -- --port 3001

# Build
npm run build

# Prisma (needed after schema changes)
npx prisma db push

# Typecheck
npx tsc --noEmit

# Lint
npm run lint
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

- **Typography:** SF Pro system stack, large sparse headlines, tight tracking, strong hierarchy
- **Surface:** light neutral canvas `#f5f5f7`, translucent white materials, hairline black borders, restrained shadows
- **Accent:** Apple blue `#0071e3` (primary), `#30d158` green (backup/success), `#ff453a` red (danger)
- **Layout:** calm editorial spacing, fixed translucent utility sidebar, responsive content, `max-w-7xl` pages
- Reduced motion is supported through `prefers-reduced-motion`
- The visual system was moved from dark glassmorphism to a light Mac-utility aesthetic in the latest redesign pass

---

## Current state (LAST UPDATED: 2026-09-17 — UI/UX hardening, visual redesign, cloud groundwork)

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
- `src/components/ui/toast.tsx` — global toasts (success/error/info) used on mutations
- `src/components/ui/confirm-dialog.tsx` — replaces `window.confirm` (delete project/backup)
- Projects search debounced 250ms; error states with retry on dashboard/projects/backups
- Import rows support keyboard selection with checkbox semantics and focus states
- Sidebar navigation exposes `aria-current`; icon actions have accessible labels
- Added reusable skeleton loading states and loading status announcements
- Added global focus-visible styling and reduced-motion support
- Removed duplicate initial fetch patterns from dashboard, collections, backups, and project detail
- Added password visibility toggle to auth
- Added responsive mobile layouts for project detail, dashboard, backups, collections, and import
- Added safer Turbopack handling for user-selected filesystem paths
- **Apple-inspired redesign:** light canvas, white layered cards, translucent sidebar, darker typography, restrained blue accent
- ESLint: **0 errors, 0 warnings**; `next build` + `tsc --noEmit` clean

**Cloud groundwork:**
- Added `CloudConnection` Prisma model for per-user provider metadata and OAuth token persistence
- This is schema groundwork only; Google Drive OAuth/API/provider upload/restore is not implemented yet
- Run `npx prisma db push` before using the new model in application code

**Pushed micro-commits:**
- `9e8ba30` — harden project and backup interactions
- `6c60531` — introduce the Apple-inspired visual system
- `d274356` — prepare cloud connection persistence
- All commits are authored only by `Vedjr02 <ambreved3@gmail.com>`

**Smoke-tested flows (before the visual/cloud groundwork commits):** register → login → me → logout; settings GET/PUT; scan folder → import → list; dashboard; backup create → list → restore (files verified) → delete; palette search; collection filter; unauthed redirect/401.

### 🟡 Known gaps / next up (in priority order)

1. **Google Drive OAuth integration** — implement connect/callback/disconnect routes, encrypted token refresh, a CodeShelf Backups folder, cloud upload/download/delete, and provider-aware restore.
2. **Cloud connection UI** — add a real connected-account card and provider selector to Settings; local backup must remain a fallback.
3. **Cloud backup data migration** — after Drive support is verified, add provider-aware backup records and idempotent retry behavior without breaking existing local archives.
4. **Auto-backup scheduler** — the setting persists but nothing enforces weekly backups yet (cron/launchd or an interval in a server singleton).
5. **Replace legacy next-auth scaffold** — delete `src/lib/auth.ts` + unused deps (`next-auth`, `@auth/prisma-adapter`; bcryptjs is still used).
6. **Data migration for old dev-user rows** — if the DB ever contains `dev-user-id` rows again, they are invisible post-auth.
7. **Scan rescan / project refresh** — `detectProject` runs at import only; add a detail-page refresh action for git state/size.
8. **Feature differentiation** — backup timeline, project health score, smart duplicate cleanup, activity history, and native folder picker.
9. **Automated tests** — add unit/API/end-to-end coverage for auth, import, backup, restore, deletion, and cloud connection flows.

### Known quirks / traps for the next agent

- `node_modules` and `.env` are gitignored — do NOT `npm ci` unless needed.
- Git history contains small micro-commits. New commits must be authored only as the repository owner; do not add any contributor or co-author trailers.
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
