# CodeShelf

A personal developer project manager and cloud backup system with a beautiful macOS-inspired dark interface.

## Features

### Project Library
- Clean card-based project display
- Automatic language and framework detection
- Git repository information (branch, remote, status)
- Project size and last modified tracking
- Favorite and pinned projects
- Tags and collections for organization

### Local Project Import
- Scan folders for coding projects
- Auto-detect:
  - Git repositories
  - Programming languages
  - Frameworks
  - Package managers
  - README files
  - GitHub remotes
  - Project dependencies

### Organization
- Create custom collections
- Add tags to projects
- Favorite projects for quick access
- Archive old projects
- Search and filter across your library

### Smart Search
- Global search across all projects
- Filter by language, framework, status
- Search syntax: `lang:typescript`, `framework:react`, `is:favorite`

### Project Detail Page
- Overview with key metrics
- README preview
- Git information
- File structure explorer
- Dependencies and scripts viewer
- Personal notes
- Backup management

### Cloud Backup
- Local storage backup (default)
- Extensible architecture for cloud providers
- Progress tracking
- Backup history
- Restore capability

### Duplicate Detection
- Detect projects with same Git remote
- Identify duplicate project structures

### Dashboard
- Total projects and storage stats
- Language and framework distribution
- Recently opened and modified projects
- Projects needing backup
- Duplicate project alerts

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **UI**: Radix UI + Tailwind CSS
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd codeshelf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/codeshelf"
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXTAUTH_URL="http://localhost:3000"
   BACKUP_STORAGE_PATH="/path/to/backup/storage"
   ```

4. Initialize the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
codeshelf/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/           # API routes
│   │   ├── projects/      # Project pages
│   │   ├── import/        # Import flow
│   │   ├── collections/   # Collections & Tags
│   │   └── settings/      # Settings page
│   ├── components/        # React components
│   │   └── ui/            # Reusable UI components
│   ├── lib/               # Utility libraries
│   │   ├── prisma.ts      # Database client
│   │   ├── auth.ts        # Authentication config
│   │   ├── backup.ts      # Backup logic
│   │   ├── backup-provider.ts # Storage provider abstraction
│   │   ├── project-detector.ts # Project detection
│   │   └── utils.ts       # Helper functions
│   ├── types/             # TypeScript types
│   └── hooks/             # React hooks
├── .env.example           # Environment template
└── README.md
```

## API Endpoints

### Projects
- `GET /api/projects` - List projects with filters
- `POST /api/projects` - Import a project
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Remove project

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Search
- `GET /api/search?q=query` - Smart search

### Backup
- `GET /api/backup` - List backups
- `POST /api/backup` - Create backup
- `DELETE /api/backup?backupId=id` - Delete backup

### Import
- `POST /api/import/scan` - Scan folder for projects

### Dashboard
- `GET /api/dashboard` - Get stats

## Extending Backup Providers

The backup system is designed to be extensible. To add a new provider:

1. Implement the `BackupProvider` interface in `src/lib/backup-provider.ts`
2. Add the provider to the factory function
3. Update the settings UI to allow provider selection

```typescript
export interface BackupProvider {
  name: string;
  type: 'local' | 'google-drive' | 's3' | 'dropbox';
  upload(sourcePath: string, destinationPath: string, onProgress?: (progress: number) => void): Promise<{ size: number; fileCount: number }>;
  download(sourcePath: string, destinationPath: string, onProgress?: (progress: number) => void): Promise<void>;
  delete(path: string): Promise<void>;
}
```

## Future Enhancements

- [ ] Google Drive integration
- [ ] Amazon S3 integration
- [ ] Semantic code search
- [ ] Real-time backup progress via WebSockets
- [ ] Project templates
- [ ] Team collaboration
- [ ] Git integration (pull, push from UI)

## License

MIT

---

Built with ❤️ for developers who have too many projects.
