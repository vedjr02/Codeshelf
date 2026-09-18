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
- Optional: `CODESHELF_EDITOR` names the editor launcher used by "Open in editor". Without it, CodeShelf tries `cursor`, `code`, `zed`, `subl`, `webstorm`, `idea` in that order.
- Postgres runs as local user `ved`. The `codeshelf` DB has 12 tables (`SmartCollection` was added this session).
- **Danger:** `npm ci` / force checkouts will wipe `.env` and `node_modules` (both gitignored). If that happens: recreate `.env` (above) and run `npm ci`.

---

## Project overview

CodeShelf is a **local project library and backup manager** for developers:

- Scans folders to discover coding projects (language, framework, package manager, git state)
- Imports them into a PostgreSQL library with tags, collections and Smart Collections
- Scores every project with a **Shelf Score** so you can see what you could lose
- Takes local zip snapshots and restores them anywhere
- Finds reclaimable disk space (dependency trees, build output, caches) and removes only what you select
- Hands projects to the desktop: reveal in Finder, open in editor, open in terminal
- Multi-user with real auth (session cookies, bcrypt credentials)

**Stack:** Next.js 16.3.5 (App Router, Turbopack), React 19, Tailwind v4 (CSS-first `@theme`), Prisma + PostgreSQL, Radix UI primitives, lucide-react, archiver v8.

**Critical file** — `AGENTS.md` — warns this Next.js version differs from training data. Read `node_modules/next/dist/docs/` before writing Next-specific code. Two verified differences: **middleware is `proxy.ts`** (named export `proxy`), and **ESLint ships strict react-hooks rules** (see quirks).

---

## Design system (read this before touching any UI)

The whole visual system lives in **`src/app/globals.css`** and nowhere else.

- **Tokens only.** Colour, radius, shadow and easing are CSS custom properties declared in `@theme`. Components use semantic utilities — `bg-surface`, `bg-surface-2`, `bg-surface-3`, `text-ink`/`ink-2`/`ink-3`/`ink-4`/`ink-5`, `border-line`/`line-2`/`line-3`, `bg-accent`, `text-accent-ink`, `text-good`/`warn`/`bad`/`violet` and their `-tint` backgrounds. **Never hardcode a hex value in a component.**
- **Two themes, one set of names.** `.dark` redefines the same tokens. There are no `!important` overrides and no per-theme class names. The previous design was a dark theme repainted light through attribute selectors; that whole layer is gone.
- **Appearance** is Light / Dark / Auto, stored in `localStorage` under `codeshelf:appearance` and applied before first paint by an inline script (`themeBootstrapScript` in `src/components/theme-provider.tsx`) so the page never flashes the wrong theme.
- **Contrast is verified, not assumed.** Every token that carries text clears WCAG AA (4.5:1) against every surface it can sit on, in both themes — including text on its own `-tint` chip background. `ink-5` is the single exception at 3:1 and is only for non-text marks (dots, chevrons, disabled glyphs). `--color-accent` is the *fill* (white text on it clears AA) and `--color-accent-ink` is accent-coloured *text*; `--color-on-status` is the text colour on a filled status colour, which is white in light mode and near-black in dark mode the way iOS does it.
- **Animations are theme values, not hand-written classes.** `--animate-fade`, `--animate-rise`, `--animate-scale-in`, `--animate-slide-from-left`, `--animate-breathe` live in `@theme`. This matters: Radix drives entrances through `data-[state=open]:` variants, and Tailwind can only build a variant around a utility it knows about. A hand-written `.animate-fade` class silently produces no `data-[state=open]:animate-fade` rule.
- **Type:** SF Pro system stack. Large titles at 32/40px with `-0.025em` tracking; body 15px; captions 11–13px. `.mono` for paths and code, `.tabular` for numbers.
- **Materials:** `.material` is translucent chrome (sidebar, toolbars, menus). Cards are opaque with a 0.5px hairline and a very soft shadow.
- **Motion:** `--ease-standard` is Apple's `cubic-bezier(0.32, 0.72, 0, 1)`. Reduced motion is honoured globally.

### Shared UI

`src/components/page-shell.tsx` gives every screen the same frame: a large title that collapses into a translucent sticky toolbar on scroll, carrying the page's actions with it. The toolbar copy of the actions is **conditionally rendered**, not hidden with opacity, so page actions never appear twice in the tab order.

---

## Current state (LAST UPDATED: 2026-09-18 — full UI/UX rebuild and feature pass)

### ✅ Done this session

**Design system rebuilt from the ground up**
- `globals.css` rewritten as a token system; every `!important` theme-translation hack deleted
- Real dark mode with a Light/Dark/Auto control (sidebar footer and Settings)
- All UI primitives rewritten against tokens: `button` (primary/secondary/ghost/link/destructive/success), `card`, `input` (+ `Textarea`, `IconInput`, `Field`), `badge` (+ `DotBadge`), `dialog`, `dropdown-menu`, `select`, `tabs` (underline tabs + Apple `Segmented` control), `switch`, `progress` (+ `Ring`), `toast`, `tooltip`, `states` (+ `SkeletonRows`), `confirm-dialog`
- Verified: every class used in `src/` resolves to a rule in the compiled stylesheet, and every text token clears WCAG AA in both themes

**New: Shelf Score** (`src/lib/health.ts`)
- One 0–100 number per project for *"can I lose this, and can I come back to it"*, from five factors: Recoverable (40), Versioned (25), Documented (15), Organized (10), Tidy (10)
- Every factor reports its own score, ceiling, plain-language state and the single next action, so the number always justifies itself
- Computed on the server in `src/lib/project-query.ts` so the list, the detail page, the palette and the dashboard can never disagree
- Surfaced as a chip in lists, a ring on the dashboard and project page, and a full breakdown in Quick Look

**New: Smart Collections** (`SmartCollection` model, `src/lib/smart-rules.ts`)
- Saved rules, not saved lists: membership is recomputed on every read
- 12 rule fields (backup state, git, working tree, language, framework, tag, collection, size, last modified, Shelf Score, favourite, archived) with all/any matching
- Rule editor matches live against your real library while you build it, so you cannot save a rule that matches nothing
- Four presets, and the sidebar lists every rule with its live count

**New: Spotlight-grade command palette**
- Fuzzy subsequence ranking with scoped queries: `lang:`, `fw:`, `tag:`, `in:`, `is:dirty|unprotected|risky|favourite|archived`
- Groups projects, Smart Collections, collections, tags and navigation; remembers recents
- Acts without leaving the palette: `⏎` open, `⌘⏎` reveal in Finder, `⌥⏎` open in editor, `⇧⏎` back up now

**New: Quick Look** — select a project and press space for a peek panel with the score breakdown and one-click actions, escape or space to dismiss. Same gesture as the Finder's.

**New: desktop integration** (`src/lib/os-actions.ts`, `POST /api/projects/[id]/open`)
- Reveal in Finder, open in editor (tries six launchers, honours `CODESHELF_EDITOR`), open in terminal, copy path
- The path always comes from the database row scoped to the session user and is passed as an argv entry, never interpolated into a shell

**New: Manage Storage** (`/api/projects/[id]/storage`)
- Scans up to three levels for 18 kinds of regenerable directory and reports each one's size, file count and why it is safe to remove
- Deletes only what you tick. Every candidate path is resolved and proven to stay inside the project, and its final segment must be a known-regenerable name, so `../../etc`, `/etc` and `src` are all rejected
- On a real project this found 728 MB of reclaimable space

**New: Backup timeline** — a project's snapshots as a timeline with the size delta between consecutive snapshots, plus a density strip across the whole span. The backups page groups every snapshot by project.

**New: refresh from disk** (`POST /api/projects/[id]/refresh`) — detection previously ran only at import, so git state and size drifted from reality immediately.

**Fixed: tags and collections were decorative** — they could be created but never attached to anything. `src/components/project-filing.tsx` is the missing half, on every project page.

**Pages rebuilt**
- **Overview** — leads with the library Shelf Score, the grade distribution and *Needs attention* with a one-click fix per row; then a facts strip, 12-week backup activity, composition, duplicate checkouts and "pick up where you left off"
- **Projects** — grid/list views (list is a sortable table), keyboard navigation, Quick Look, context headers for Smart Collections / collections / tags
- **Project detail** — score ring plus breakdown, filing, and Overview / Timeline / Storage / Files / Dependencies / README / Notes
- **Backups**, **Collections & Tags** (with the rule editor), **Import**, **Settings**, **Login** — all rebuilt on the new system

**API**
- `/api/dashboard` now answers "what needs me today" instead of returning counters
- `/api/projects` serves Shelf Scores, smart-collection filtering and score sorting
- `/api/search` rewritten as the single palette query with scoped terms and fuzzy ranking

### Verified end to end (against the live app, 2026-09-18)

23/23 checks passed: every page 200, unauthenticated pages redirect and APIs 401, register → login → me, folder scan (11 projects found), import, Shelf Score recomputation (47 → 87 after a snapshot, → 97 after filing), backup create → list → delete, restore dialog wiring, storage scan and delete with all three traversal attempts rejected, OS actions including every error path, Smart Collection create/list/filter/patch with invalid rules and duplicate names rejected, settings round-trip, scoped search (`lang:`, `is:`, `in:`, fuzzy). `next build`, `tsc --noEmit` and `eslint src` are all clean.

Test data created during verification was removed afterwards; the database is back to its previous contents.

### 🟡 Known gaps / next up (in priority order)

1. **Visual review in a browser** — this session verified the compiled CSS, contrast maths and every API, but the Chrome extension was not connected, so nothing was eyeballed. Open the app in both themes and at phone width before trusting the layout.
2. **Auto-backup scheduler** — the setting persists and Settings says so plainly ("Not active"), but nothing enforces it yet (cron/launchd or an interval in a server singleton).
3. **Google Drive OAuth** — `CloudConnection` is schema groundwork only: connect/callback/disconnect routes, encrypted token refresh, a CodeShelf Backups folder, upload/download/delete and provider-aware restore.
4. **Cloud connection UI** in Settings; local must stay the fallback.
5. **Remove the legacy next-auth scaffold** — `src/lib/auth.ts` plus `next-auth` and `@auth/prisma-adapter` are unused (bcryptjs is still used).
6. **Automated tests** — no test suite exists. Auth, import, backup, restore, storage reclaim (especially the path guards) and smart rules all deserve coverage.
7. **Native folder picker** for import, instead of typing a path.
8. ~~**Library-wide storage view**~~ — done on 2026-09-18; see the session note below.

### Known quirks / traps for the next agent

- `node_modules` and `.env` are gitignored — do NOT `npm ci` unless needed.
- **Tailwind v4 variants only wrap real utilities.** If you write a plain CSS class and then use it inside a variant (`data-[state=open]:my-class`), nothing is generated and the style silently does not exist. Declare it in `@theme` instead. This bit the dialog, menu, tooltip and tab animations; a class-vs-compiled-CSS audit is the fastest way to catch it.
- **ESLint `react-hooks/set-state-in-effect`:** calling setState synchronously in an effect errors, including via an async helper. The working pattern is an async IIFE with a cancellation flag:
  ```ts
  useEffect(() => {
    const signal = { cancelled: false };
    (async () => { await load(signal); })();
    return () => { signal.cancelled = true; };
  }, [load]);
  ```
  For an immediate synchronous update, wrap it in `requestAnimationFrame`.
- **ESLint `react-hooks/static-components`:** a component defined inside another component's body is an error. Hoist it to module scope and pass what it needs as props.
- **`useSearchParams` needs a Suspense boundary at build time.** The sidebar reads it to highlight the active collection, so `AppShell` wraps it in `<React.Suspense fallback={<SidebarFallback />}>`. Without that, `next build` fails prerendering every page.
- **`tsc` may report stale `.next/dev/types` errors** after moving or renaming page files — `rm -rf .next` (or run the dev server) to regenerate; not a source error.
- Background dev servers get reaped when a terminal session ends. Use `screen -dmS codeshelf bash -c '… exec node node_modules/.bin/next dev …'` to keep one alive.
- Restore and archive deletion require `unzip` on PATH (macOS has it).
- `getLanguageColor` / `getFrameworkColor` in `src/lib/utils.ts` drive all language dots. Those are GitHub's colours and some are low-contrast, so they are used only as dots and tints, never as text.
- API routes live in `src/app/api/...`: `auth/*`, `projects`, `projects/[id]`, `projects/[id]/open`, `projects/[id]/refresh`, `projects/[id]/storage`, `dashboard`, `backup` (incl. `PUT` restore), `settings`, `collections`, `tags`, `smart-collections`, `smart-collections/[id]`, `search`, `import/scan`.

---

## Session: 2026-09-18 — density pass and library-wide Storage

### Layout and density

The complaint was that the app "looks too small". Two separate causes:

- **Content was capped at 1120px** (`PageShell` `WIDTHS.default`) while the sidebar took 248px. On a 1728px display that left roughly 180px of dead gutter on each side. `default` and `wide` are now fluid up to **1600px**, `narrow` went 760 → 860px, and page gutters gain `xl:px-10`.
- **The type scale ran small.** Every `text-[Npx]` utility in `src/` moved up one step (11 → 12, 12.5 → 13.5, 13.5 → 14.5, 15 → 16, and so on), and body copy went 15 → 16px with line-height 1.47 → 1.5. Control heights followed so the density still reads right: button `xs` 28 → 30px, `sm` 32 → 34px, sidebar rows 30 → 34px, sidebar itself 248 → 264px.
- **The Overview used the new width.** It was a 3-column grid inside a narrow cap, so the right-hand column was a strip. It is now a 12-column grid at `2xl` — Needs attention (5), Backup activity and Composition (4), Disk and Pick up where you left off (3) — and the Projects grid gains a fourth card column at `2xl`.

### New: Storage across the whole library

`Manage Storage` answered "why is this project 900 MB". The new page answers "where did my disk go".

- `src/lib/reclaim.ts` now holds the scan, the measurement, the path guards and the delete. The per-project route and the library route call the same code, so a path that is unsafe in one is unsafe in both.
- `GET /api/storage` walks every non-archived project, sequentially (parallel disk walks are slower, not faster), and caches the result per user for five minutes. `?refresh=1` forces a fresh walk; `?cached=1` returns `{ pending: true }` rather than starting one, which is what the Overview tile uses so opening the Overview never blocks on a disk walk.
- `DELETE /api/storage` takes selections across several projects. Every path is re-resolved against its own project on the server before anything is removed, and the whole plan is resolved before the first delete, so one bad path cannot leave half the selection already gone. Any delete invalidates the cache.
- `/storage` shows the total, a bar of the five heaviest projects, and a per-project list that expands to each folder with its size and what it is. Selection works per folder or per project, with select-all.
- The Overview gained a **Disk** tile that reads the cached number and links to the page; with nothing cached it reads "not scanned yet" and offers a scan.

### Verified

- `tsc --noEmit`, `eslint src` and `next build` are all clean; `/storage` and `/api/storage` appear in the build output.
- `/storage` redirects to `/login` unauthenticated (307); `/api/storage` answers 401 on both GET and DELETE.
- The scan and its guards were exercised directly against a fixture tree: `node_modules` and a nested `packages/ui/dist` were found with correct sizes and reasons, `.git` and `src` were not, a missing project folder was flagged rather than throwing, and `resolveInside` rejected `../../etc`, `/etc`, `src`, `""`, `node_modules/../../../etc` and `.git` while accepting `node_modules` and `packages/ui/dist`.
- **Still not eyeballed in a browser.** The Chrome extension was not connected this session either, so the width and density changes are verified as compiled output only. Open both themes and phone width before trusting them.

---

## How sessions continue here

A new session should:
1. Read this file and `README.md`.
2. Start the dev server and open the app to eyeball the current state.
3. Continue from **"Known gaps"** — highest priority first.
4. After every batch: `tsc --noEmit`, `eslint src`, `next build`, then commit small slices.
5. **Update this file**, then commit the progress update too.

---

## Commit convention

- Small, single-purpose micro-commits.
- Messages: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `docs:` prefix.
- New commits must be authored only as the repository owner. Do not add any
  contributor or co-author trailers.
