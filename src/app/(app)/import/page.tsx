'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, FolderSearch, GitBranch, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged } from '@/components/library-context';
import { formatBytes, getLanguageColor, plural, prettyPath, cn } from '@/lib/utils';

interface ScannedProject {
  path: string;
  name: string;
  language?: string | null;
  framework?: string | null;
  packageManager?: string | null;
  isGitRepo: boolean;
  gitRemote?: string | null;
  size: number;
}

const SUGGESTIONS = ['~/Developer', '~/Documents', '~/Projects', '~/code', '~/src'];

export default function ImportPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [folder, setFolder] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [scanned, setScanned] = React.useState<ScannedProject[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const scan = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!folder.trim()) return;

    setScanning(true);
    setError(null);
    setScanned(null);
    setSelected(new Set());

    try {
      const res = await fetch('/api/import/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folder.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'That folder could not be scanned.');

      const found = (payload.projects ?? []) as ScannedProject[];
      setScanned(found);
      setSelected(new Set(found.map((project) => project.path)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That folder could not be scanned.');
    } finally {
      setScanning(false);
    }
  };

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const importSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    setProgress(0);

    const paths = Array.from(selected);
    const failed: string[] = [];

    for (let index = 0; index < paths.length; index += 1) {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: paths[index] }),
        });
        if (!res.ok) failed.push(paths[index].split('/').pop() || paths[index]);
      } catch {
        failed.push(paths[index].split('/').pop() || paths[index]);
      }
      setProgress(Math.round(((index + 1) / paths.length) * 100));
    }

    notifyLibraryChanged();

    if (failed.length === 0) {
      success(`Imported ${plural(paths.length, 'project')}`, 'Shelf Scores are ready on the overview.');
      router.push('/projects');
      return;
    }

    setImporting(false);
    const imported = paths.length - failed.length;
    if (imported > 0) success(`Imported ${plural(imported, 'project')}`);
    toastError(
      failed.length === 1 ? `Could not import “${failed[0]}”` : `Could not import ${failed.length} projects`,
      'They may already be in your library.'
    );
  };

  const allSelected = scanned !== null && selected.size === scanned.length && scanned.length > 0;

  return (
    <PageShell
      title="Import projects"
      back={{ href: '/projects', label: 'Projects' }}
      subtitle="Give CodeShelf a folder. It looks inside for package manifests and git repositories, works out the language, framework and size of each project, and lists what it found."
      actions={
        scanned && scanned.length > 0 ? (
          <Button
            variant="primary"
            size="pill"
            onClick={() => void importSelected()}
            disabled={selected.size === 0 || importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {importing ? 'Importing…' : `Import ${selected.size}`}
          </Button>
        ) : undefined
      }
    >
      {/* ---- Scan ------------------------------------------------------- */}
      <Card className="p-5">
        <form onSubmit={scan} className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <IconInput
              icon={<FolderSearch />}
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="/Users/you/Developer"
              className="mono"
              disabled={scanning || importing}
              aria-label="Folder to scan"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={scanning || importing || !folder.trim()}
            className="shrink-0"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {scanning ? 'Scanning…' : 'Scan folder'}
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[13.5px] text-ink-4">Common places:</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={scanning || importing}
              onClick={() => setFolder(suggestion.replace('~', ''))}
              className="mono rounded-full bg-surface-3 px-2 py-0.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink disabled:opacity-50"
              title={`Fill in ${suggestion} — replace with your full home path`}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-bad-tint px-3.5 py-3 text-[14px] text-bad">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {importing && (
        <Card className="mt-4 p-5">
          <div className="mb-2.5 flex items-center justify-between text-[14.5px]">
            <span className="text-ink-2">Importing {plural(selected.size, 'project')}…</span>
            <span className="tabular text-ink-3">{progress}%</span>
          </div>
          <Progress value={progress} />
        </Card>
      )}

      {/* ---- Results ---------------------------------------------------- */}
      {scanning ? (
        <Card className="mt-5 p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
            <p className="text-[14.5px] text-ink-3">Walking the folder and reading manifests…</p>
          </div>
        </Card>
      ) : scanned === null ? null : scanned.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon={<FolderSearch />}
            title="No projects in that folder"
            description="CodeShelf looks for package.json, requirements.txt, Cargo.toml, go.mod, Gemfile, pom.xml and git repositories. Try the folder one level up."
          />
        </Card>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.018em] text-ink">
                Found {plural(scanned.length, 'project')}
              </h2>
              <p className="text-[14px] text-ink-3">
                {selected.size} selected · {formatBytes(
                  scanned.filter((p) => selected.has(p.path)).reduce((sum, p) => sum + p.size, 0)
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={importing}
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(scanned.map((project) => project.path)))
              }
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
          </div>

          <Card className="overflow-hidden" elevation="flat">
            {scanned.map((project) => {
              const isSelected = selected.has(project.path);
              const color = getLanguageColor(project.language);
              return (
                <label
                  key={project.path}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border-b-[0.5px] border-line px-4 py-3 last:border-b-0',
                    'transition-colors duration-100',
                    isSelected ? 'bg-accent-tint' : 'hover:bg-surface-3',
                    importing && 'pointer-events-none opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
                      isSelected ? 'border-accent bg-accent text-on-accent' : 'border-line-3'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => toggle(project.path)}
                      disabled={importing}
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-ink">{project.name}</span>
                      {project.language && (
                        <span className="shrink-0 text-[12.5px] text-ink-4">{project.language}</span>
                      )}
                      {project.framework && (
                        <span className="hidden shrink-0 rounded-full bg-surface-3 px-1.5 py-px text-[12px] text-ink-3 sm:inline">
                          {project.framework}
                        </span>
                      )}
                    </span>
                    <span className="mono block truncate text-[12.5px] text-ink-4">{prettyPath(project.path)}</span>
                  </span>

                  <span className="hidden shrink-0 items-center gap-1 text-[13px] text-ink-4 sm:flex">
                    {project.isGitRepo && (
                      <>
                        <GitBranch className="h-3 w-3" />
                        git
                      </>
                    )}
                  </span>
                  <span className="shrink-0 text-[13.5px] tabular text-ink-3">{formatBytes(project.size)}</span>
                </label>
              );
            })}
          </Card>

          <div className="mt-5 flex justify-end">
            <Button
              variant="primary"
              size="pill-lg"
              onClick={() => void importSelected()}
              disabled={selected.size === 0 || importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? 'Importing…' : `Import ${plural(selected.size, 'project')}`}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
