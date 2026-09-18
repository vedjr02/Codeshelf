# CodeShelf

Your personal project library and local backup manager. CodeShelf scans your machine for coding projects, imports them into a searchable library, scores each one on how recoverable it actually is, and protects your work with one-click local snapshots you can restore anywhere.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/React-19-black) ![stack](https://img.shields.io/badge/Tailwind-4-black) ![stack](https://img.shields.io/badge/Prisma-5-black) ![stack](https://img.shields.io/badge/PostgreSQL-local-black)

## Features

### Know what you could lose

- **Shelf Score** — one number, 0 to 100, for every project: can you lose it, and can you come back to it? It is built from five factors you can inspect: whether a snapshot exists and how fresh it is, whether there is a git remote, whether there is a README worth reading, whether the project is filed anywhere, and whether the working tree is clean. Every factor shows its own score and the single next action that would raise it.
- **Overview that answers "what needs me today"** — the library score, how the grades are distributed, and the weakest projects first with a one-click fix on each row.
- **Duplicate checkouts** — several folders pointing at one remote, and how much disk that is costing you.

### Find things

- **Command palette** (⌘K) with fuzzy matching and scoped queries: `lang:typescript`, `is:dirty`, `is:unprotected`, `tag:client`, `in:work`. Act without leaving it — `⏎` open, `⌘⏎` reveal in Finder, `⌥⏎` open in your editor, `⇧⏎` take a snapshot.
- **Quick Look** — select a project, press space, see everything that matters. Escape to dismiss.
- **Smart Collections** — save the *rule*, not the list: "never backed up and no remote", "uncommitted changes", "untouched for six months", "over 500 MB". Membership is recomputed every time you look, so it never goes stale. The editor matches against your real library while you build the rule.
- Hand-made collections and tags for everything rules cannot express.

### Protect it

- **Local zip snapshots** with smart exclusions (`node_modules`, `.git`, build output, caches), so they stay small.
- **Backup timeline** per project, showing how much the project grew or shrank between consecutive snapshots.
- **Restore anywhere** — always extracted into a new timestamped folder; the original is never modified.

### Reclaim your disk

- **Manage Storage** finds the dependency trees, build output and caches inside a project, tells you what each one is and why it is safe to remove, and deletes only what you tick. Nothing you wrote is touched.
- **Storage across the whole library** — the same scan run over every project at once, biggest first, with one bar showing where the space actually went. Expand a project to see each folder and what it is, tick across as many projects as you like, and free it all in one pass. The result is cached for five minutes so reopening the page is instant, and any delete drops the cache.

### Live where you work

- **Reveal in Finder**, **open in your editor**, **open a terminal there**, copy the path — from the palette, any list row, or the project page.
- **Refresh from disk** re-reads git state, size, dependencies and README on demand.

### Built like a Mac app

- Light, dark and auto appearance, applied before first paint so it never flashes.
- One token-driven design system: every colour, radius, shadow and easing is a CSS custom property, and every token that carries text clears WCAG AA in both themes.
- Full keyboard use, respected reduced-motion, and grid or sortable-list views of the library.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (any recent version)

### Setup

```bash
# install
npm ci

# create the database (adjust name/URL in .env to match)
createdb codeshelf

# .env (local only, not committed)
# DATABASE_URL="postgresql://<you>@localhost:5432/codeshelf"
# BACKUP_STORAGE_PATH="/tmp/codeshelf-backups"
# CODESHELF_EDITOR="code"   # optional; otherwise cursor/code/zed/subl/webstorm/idea are tried
# CODESHELF_ALLOW_REGISTRATION="true"   # optional; reopens sign-up after the first account

# push the schema
npx prisma db push

# run
npm run dev
```

Open the printed localhost URL, **create an account**, then hit **Import Projects** and scan a folder — for example your `~/Developer` directory.

### Production build

```bash
npm run build
npm start
```

## Project layout

```
src/
├── proxy.ts                  # auth guard (Next 16's renamed middleware)
├── app/
│   ├── globals.css           # the entire design system: tokens, materials, motion
│   ├── login/                # sign in / create account (chrome-free)
│   ├── (app)/                # authed route group, rendered inside AppShell
│   │   ├── page.tsx          # overview
│   │   ├── projects/         # library + [id] detail (timeline, storage, files, notes)
│   │   ├── backups/          # every snapshot, grouped by project
│   │   ├── storage/          # library-wide reclaimable space
│   │   ├── collections/      # collections, tags, Smart Collection rule editor
│   │   ├── import/           # folder scan → multi-select import
│   │   └── settings/         # appearance, snapshot location, preferences
│   └── api/                  # auth, projects (+open/refresh/storage), backup,
│                             # dashboard, search, settings, collections, tags,
│                             # smart-collections, storage (library-wide)
├── components/
│   ├── app-shell.tsx         # layout, mobile drawer, providers
│   ├── page-shell.tsx        # shared page frame with a collapsing toolbar
│   ├── sidebar.tsx           # navigation, Smart Collections, collections, tags
│   ├── command-palette.tsx   # ⌘K
│   ├── quick-look.tsx        # space-bar peek
│   ├── score.tsx             # Shelf Score chip, ring and breakdown
│   ├── backup-timeline.tsx   # snapshots with size deltas
│   ├── storage-panel.tsx     # Manage Storage
│   └── ui/                   # token-driven primitives
└── lib/
    ├── health.ts             # the Shelf Score
    ├── reclaim.ts            # the storage scan, path guards and delete
    ├── smart-rules.ts        # rule schema, evaluator and presets
    ├── project-query.ts      # one place that serializes and scores a project
    ├── os-actions.ts         # Finder / editor / terminal
    ├── backup.ts             # archiver v8 engine
    ├── project-detector.ts   # language, framework, git, dependencies
    └── session.ts            # DB-backed sessions
```

## Notes

- Everything runs on this machine. Your library, notes and archives never leave it.
- Snapshots are written under `BACKUP_STORAGE_PATH` (default `/tmp/codeshelf-backups`). **Point this somewhere durable in Settings** — macOS can clear `/tmp` on restart, and CodeShelf warns you when the path starts with it.
- Removing a project from CodeShelf never touches files on disk. Deleting a snapshot removes that archive permanently, with confirmation.
- Restore extracts into a **new timestamped folder** inside the destination you choose.
- Manage Storage only ever removes directories whose name is on a known-regenerable list, after resolving the path and proving it stays inside the project. The library-wide page re-resolves every path against its own project on the server, so nothing the browser sends is trusted.
- Automatic weekly snapshots are not implemented yet; Settings labels the toggle as inactive rather than pretending otherwise.

## Security

An account here can read, archive and delete folders on the host machine, so the server is meant to be bound to localhost. If you expose the port, treat it as remote access to your filesystem.

- **Sign-up closes after the first account.** The first run creates your account; after that `/api/auth/register` returns 403 and the login page hides the tab. Set `CODESHELF_ALLOW_REGISTRATION=true` to add another person deliberately.
- **Sign-in is rate limited** to 10 attempts per client per 10 minutes, and answers "no such account" and "wrong password" identically, in the same time, so the form does not reveal which emails exist.
- **Every route is behind the session check** in `src/proxy.ts`, and every API route re-checks the session itself and scopes its queries to the signed-in user.
- **Responses carry a nonce-based CSP**, plus `X-Frame-Options: DENY`, `nosniff`, `no-referrer` and `X-Robots-Tag: noindex`. HSTS is added only when the connection is already HTTPS. `robots.txt` disallows everything; there is deliberately no sitemap.
- **Nothing reaches a shell.** Archive extraction and every OS action pass paths as argv entries via `execFile`, so a folder name containing quotes or `$(...)` is only ever a folder name.

## Deploying to Vercel

CodeShelf was built to run on the machine your projects live on, and the hosted
version cannot be. A serverless host has no access to your home directory, no
editor on PATH, and a filesystem that is empty again on the next request.

So the deployment splits the app in two. Hosted, it serves the library, search,
collections, smart collections, tags, notes, settings and auth against a hosted
Postgres. The routes that reach a disk answer `501` with `desktopOnly: true` and
an explanation, rather than a stack trace:

| Route | Hosted |
|---|---|
| `POST /api/import/scan` | 501 — scanning reads your disk |
| `POST /api/projects` | 501 — adding by path reads that folder |
| `POST /api/projects/[id]/open` | 501 — needs Finder or an editor |
| `POST /api/projects/[id]/refresh` | 501 — re-reads the folder |
| `GET`/`DELETE /api/projects/[id]/storage` | 501 — measures and deletes on disk |
| `GET`/`DELETE /api/storage` | 501 — same, across the library |
| `POST`/`PUT`/`DELETE /api/backup` | 501 — archives live on disk |
| `GET /api/backup` | works — reads history from the database |

`src/lib/desktop.ts` decides which shape to run. It follows the host: disk
features are on everywhere except Vercel. `CODESHELF_DESKTOP=1` forces them on
(for a server with a real volume), `CODESHELF_DESKTOP=0` forces them off.

### 1. A hosted database

Create a Postgres database — [Neon](https://neon.tech) has a free tier that suits
this. Copy two connection strings:

- the **pooled** one → `DATABASE_URL`
- the **direct**, unpooled one → `DIRECT_URL`

Both are needed. The app runs through the pooler because serverless opens a new
client per invocation; schema changes cannot go through a pooler at all.

### 2. Push the schema

From your machine, against the hosted database:

```bash
DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma db push
```

### 3. Deploy

Import the repository at [vercel.com/new](https://vercel.com/new). Vercel detects
Next.js on its own; the build script already runs `prisma generate` first, which
is what keeps a cached `node_modules` from shipping a stale client.

Set these environment variables for Production, Preview and Development:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled connection string |
| `DIRECT_URL` | the direct connection string |

Those two are all that is needed. Nothing else has to be set: `CODESHELF_DESKTOP`
already resolves to off on Vercel, and `BACKUP_STORAGE_PATH` is meaningless on a
host with no durable disk.

Deploy, open the URL, and create your account. Sign-up is open only while the
user table is empty, so the first person to reach the URL claims the instance —
create your account as soon as the deployment is live, before sharing the link.
After that `/api/auth/register` returns 403 until you deliberately set
`CODESHELF_ALLOW_REGISTRATION=true`.

Every push to `main` redeploys from then on.

### Running both

The hosted instance and your local one are separate databases unless you point
local `.env` at the hosted connection strings. If you do, your local CodeShelf
keeps full disk access while sharing one library with the hosted read-only view —
which is the arrangement that actually makes sense for this app.
