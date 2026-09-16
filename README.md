# CodeShelf

Your personal project library & local backup manager. CodeShelf scans your machine for coding projects, imports them into a searchable library (with languages, frameworks, git state and dependencies auto-detected), and protects your work with one-click local zip backups you can restore anytime.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/React-19-black) ![stack](https://img.shields.io/badge/Prisma-5-black) ![stack](https://img.shields.io/badge/PostgreSQL-local-black)

## Features

- **Project discovery** — scan any folder (recursively) and CodeShelf detects projects via `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, git repos, and more; identifies language, framework, and package manager
- **Library & organization** — favorites, archives, collections, and tags with real filtered views
- **Local zip backups** — one-click snapshots with smart exclusions (`node_modules`, `.git`, build output, caches), progress tracking, and full restore anywhere on disk
- **Backup health** — dashboard ring showing protected vs. at-risk projects, plus a global backups page with storage stats
- **Command palette** — ⌘K / Ctrl+K to search projects or jump anywhere
- **Multi-user auth** — email + password registration with DB-backed sessions (30-day, httpOnly cookies)
- **Apple-style dark UI** — true-black canvas, frosted surfaces, SF-style typography, fully responsive with a mobile drawer

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (any recent version)

### Setup

```bash
# install
npm ci   # note: this wipes nothing; .env is gitignored and separate

# create the database (adjust name/URL in .env to match)
createdb codeshelf

# .env (local only, not committed)
# DATABASE_URL="postgresql://<you>@localhost:5432/codeshelf"
# BACKUP_STORAGE_PATH="/tmp/codeshelf-backups"

# push the schema
node node_modules/.bin/prisma db push

# run
node node_modules/.bin/next dev
```

Open the printed localhost URL, **create an account**, then hit **Import Project** and scan a folder — e.g. your `~/Developer` directory.

### Production build

```bash
node node_modules/.bin/next build
node node_modules/.bin/next start
```

## Project layout

```
src/
├── proxy.ts               # auth guard (Next 16's renamed middleware)
├── app/
│   ├── login/             # sign in / register (chrome-free)
│   ├── (app)/             # authed route group — rendered inside AppShell
│   │   ├── page.tsx       # dashboard (+ first-run onboarding)
│   │   ├── projects/      # library + [id] detail (tabs, backups, notes)
│   │   ├── backups/       # global snapshots: create/restore/delete
│   │   ├── collections/   # collections & tags
│   │   ├── import/        # folder scan → multi-select import
│   │   └── settings/      # persisted preferences
│   └── api/               # auth, projects, backup (+PUT restore), settings, search…
├── components/            # app-shell, sidebar, command palette, ui/ primitives
└── lib/                   # session, backup engine (archiver v8), project detector, prisma
```

## Notes

- Backups are stored under `BACKUP_STORAGE_PATH` (default `/tmp/codeshelf-backups`) — point it somewhere durable in Settings.
- Deleting a project from CodeShelf never touches files on disk; deleting a backup removes the archive permanently (with confirmation).
- Restore extracts into a **new timestamped folder** inside your chosen destination — the original project is never modified.
