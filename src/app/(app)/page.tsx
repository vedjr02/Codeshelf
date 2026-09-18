'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Copy,
  FolderSearch,
  HardDrive,
  Layers,
  Plus,
  ShieldPlus,
  Sparkles,
} from 'lucide-react';
import { PageShell, Section } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ScoreChip, ScoreRing } from '@/components/score';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged } from '@/components/library-context';
import { formatBytes, formatRelativeTime, getLanguageColor, plural, prettyPath, cn } from '@/lib/utils';
import { gradeLabel, type HealthGrade } from '@/lib/health';
import type { LibraryReclaim } from '@/types/client';

interface DashboardData {
  totalProjects: number;
  archivedCount: number;
  totalSize: number;
  libraryScore: number;
  libraryGrade: HealthGrade;
  gradeCounts: Record<HealthGrade, number>;
  protectedCount: number;
  attention: Array<{
    id: string;
    name: string;
    language?: string | null;
    score: number;
    grade: HealthGrade;
    headline: string;
    lastBackupAt?: string | null;
  }>;
  recent: Array<{
    id: string;
    name: string;
    path: string;
    language?: string | null;
    lastOpened?: string | null;
    score: number;
  }>;
  recentlyModified: Array<{
    id: string;
    name: string;
    path: string;
    language?: string | null;
    lastModified?: string | null;
    gitStatus?: string | null;
    score: number;
  }>;
  languages: Array<{ name: string; count: number }>;
  frameworks: Array<{ name: string; count: number }>;
  backupSummary: {
    total: number;
    failed: number;
    totalSize: number;
    lastBackupAt: string | null;
    weeks: Array<{ weekStart: string; count: number }>;
  };
  duplicateGroups: Array<{
    gitRemote: string;
    count: number;
    wastedSize: number;
    projects: Array<{ id: string; name: string; path: string; size: number }>;
  }>;
}

const GRADE_ORDER: HealthGrade[] = ['excellent', 'good', 'fair', 'at-risk'];
const GRADE_TOKEN: Record<HealthGrade, string> = {
  excellent: 'var(--color-good)',
  good: 'var(--color-accent)',
  fair: 'var(--color-warn)',
  'at-risk': 'var(--color-bad)',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  // Reclaimable space, read from the cache only. A full disk walk belongs to
  // the Storage page, not to opening the Overview.
  const [reclaim, setReclaim] = React.useState<LibraryReclaim | null>(null);
  const { success, error: toastError } = useToast();

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Could not load your library');
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your library');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      await load();
      if (signal.cancelled) return;
      try {
        const res = await fetch('/api/storage?cached=1');
        if (!res.ok) return;
        const payload = (await res.json()) as LibraryReclaim;
        if (!signal.cancelled && !payload.pending) setReclaim(payload);
      } catch {
        // The tile is an extra; if it cannot load, the page is still complete.
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const backUp = async (projectId: string, name: string) => {
    setBusyId(projectId);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Backup failed');
      success('Snapshot created', name);
      notifyLibraryChanged();
      await load();
    } catch (err) {
      toastError('Backup failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <PageShell title="Overview" subtitle="Reading your library…">
        <div className="space-y-6">
          <Skeleton className="h-[220px] w-full rounded-[var(--radius-xl)]" />
          <div className="grid gap-5 lg:grid-cols-3">
            <Skeleton className="h-[260px] rounded-[var(--radius-xl)] lg:col-span-2" />
            <Skeleton className="h-[260px] rounded-[var(--radius-xl)]" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell title="Overview">
        <Card className="p-4">
          <ErrorState message={error ?? 'Something went wrong'} retry={load} />
        </Card>
      </PageShell>
    );
  }

  /* ---- First run: an empty shelf gets instructions, not a dashboard ---- */
  if (data.totalProjects === 0) {
    return (
      <PageShell
        title="Welcome to CodeShelf"
        subtitle="Point it at a folder and it will find every project inside, work out what each one is, and tell you which ones you could lose."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '1',
              icon: FolderSearch,
              title: 'Scan a folder',
              body: 'Languages, frameworks, git state and size are detected for you.',
              href: '/import',
              cta: 'Scan a folder',
            },
            {
              step: '2',
              icon: Layers,
              title: 'Let rules file it',
              body: 'Smart Collections group projects by what they are, and stay correct as things change.',
              href: '/collections?new=smart',
              cta: 'Make a rule',
            },
            {
              step: '3',
              icon: ShieldPlus,
              title: 'Protect the work',
              body: 'One click takes a local snapshot you can restore anywhere.',
              href: '/backups',
              cta: 'About backups',
            },
          ].map((step) => (
            <Card key={step.step} className="flex flex-col p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[14px] font-semibold tabular text-ink-3">
                {step.step}
              </span>
              {/* h2: the only heading above these on the first-run page is the
                  page title, so h3 would skip a level for a screen reader. */}
              <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.018em]">{step.title}</h2>
              <p className="mt-1.5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{step.body}</p>
              <Button asChild variant="link" size="sm" className="mt-4 self-start px-0">
                <Link href={step.href}>
                  {step.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-[14px] text-ink-4">
          Press{' '}
          <kbd className="rounded-[5px] border-[0.5px] border-line bg-surface-3 px-1.5 py-0.5 text-[12.5px]">⌘K</kbd>{' '}
          anywhere to search or jump.
        </p>
      </PageShell>
    );
  }

  const weekMax = Math.max(1, ...data.backupSummary.weeks.map((w) => w.count));

  // Prefer what you actually opened; fall back to what changed on disk.
  const continueList =
    data.recent.length > 0
      ? data.recent.slice(0, 5).map((p) => ({ id: p.id, name: p.name, when: p.lastOpened ?? null }))
      : data.recentlyModified.slice(0, 5).map((p) => ({ id: p.id, name: p.name, when: p.lastModified ?? null }));
  const langTotal = data.languages.reduce((sum, l) => sum + l.count, 0);

  return (
    <PageShell
      title={greeting()}
      subtitle={`${plural(data.totalProjects, 'project')} on the shelf · ${formatBytes(data.totalSize)} of source`}
      actions={
        <Button asChild variant="primary" size="pill">
          <Link href="/import">
            <Plus className="h-4 w-4" />
            Import
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ---- Shelf Score: the headline the whole page hangs off ------- */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7">
            <ScoreRing
              score={data.libraryScore}
              grade={data.libraryGrade}
              size={112}
              thickness={9}
              caption="Shelf Score"
            />

            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-semibold tracking-[-0.022em] text-ink">
                Your library is {gradeLabel(data.libraryGrade).toLowerCase()}
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-3">
                {data.protectedCount} of {data.totalProjects} projects have a snapshot.{' '}
                {data.gradeCounts['at-risk'] > 0
                  ? `${plural(data.gradeCounts['at-risk'], 'project')} could be lost today.`
                  : 'Nothing is in immediate danger.'}
              </p>

              {/* Distribution: one bar, four states, no chart junk. */}
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface-3">
                {GRADE_ORDER.map((grade) => {
                  const count = data.gradeCounts[grade];
                  if (count === 0) return null;
                  return (
                    <div
                      key={grade}
                      className="h-full transition-[width] duration-700 ease-[var(--ease-standard)]"
                      style={{
                        width: `${(count / data.totalProjects) * 100}%`,
                        backgroundColor: GRADE_TOKEN[grade],
                      }}
                      title={`${count} ${gradeLabel(grade).toLowerCase()}`}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                {GRADE_ORDER.map((grade) => (
                  <span key={grade} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                    <span
                      aria-hidden="true"
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ backgroundColor: GRADE_TOKEN[grade] }}
                    />
                    {gradeLabel(grade)}
                    <span className="tabular text-ink-4">{data.gradeCounts[grade]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Facts strip — hairline separated, no boxes. */}
          <div className="grid grid-cols-2 gap-px border-t-[0.5px] border-line bg-line sm:grid-cols-4">
            <Fact label="Projects" value={String(data.totalProjects)} hint={data.archivedCount > 0 ? `${data.archivedCount} archived` : undefined} />
            <Fact label="Source size" value={formatBytes(data.totalSize)} />
            <Fact label="Snapshots" value={String(data.backupSummary.total)} hint={formatBytes(data.backupSummary.totalSize)} />
            <Fact
              label="Last backup"
              value={formatRelativeTime(data.backupSummary.lastBackupAt)}
              hint={data.backupSummary.failed > 0 ? `${data.backupSummary.failed} failed` : undefined}
              hintTone={data.backupSummary.failed > 0 ? 'bad' : undefined}
            />
          </div>
        </Card>

        {/* Three real columns once there is room for them, so a wide window
            shows the whole page at once instead of one long strip. */}
        <div className="grid gap-5 lg:grid-cols-3 2xl:grid-cols-12">
          {/* ---- Needs attention: the working part of the page --------- */}
          <div className="lg:col-span-2 2xl:col-span-5">
            <Section
              title="Needs attention"
              description="Ordered by Shelf Score — the weakest first."
              action={
                <Button asChild variant="link" size="sm" className="px-0">
                  <Link href="/projects?sortBy=health&sortOrder=asc">
                    See all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <Card className="overflow-hidden" elevation="flat">
                {data.attention.length === 0 ? (
                  <EmptyState
                    icon={<Sparkles className="text-good" />}
                    title="Everything is in good shape"
                    description="Every project is backed up, tracked and documented. Nothing needs you right now."
                  />
                ) : (
                  data.attention.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-3 border-b-[0.5px] border-line px-4 py-3 last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: getLanguageColor(project.language) }}
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/projects/${project.id}`}
                          className="block truncate text-[15px] font-medium text-ink hover:text-accent-ink"
                        >
                          {project.name}
                        </Link>
                        <p className="truncate text-[13.5px] text-ink-3">{project.headline}</p>
                      </div>
                      <ScoreChip score={project.score} grade={project.grade} />
                      {!project.lastBackupAt && (
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={busyId === project.id}
                          onClick={() => void backUp(project.id, project.name)}
                          className="shrink-0"
                        >
                          <ShieldPlus className="h-[13px] w-[13px]" />
                          {busyId === project.id ? 'Working…' : 'Back up'}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </Card>
            </Section>

            {/* ---- Duplicates ---------------------------------------- */}
            {data.duplicateGroups.length > 0 && (
              <Section
                className="mt-6"
                title="Duplicate checkouts"
                description="Several folders point at the same remote."
              >
                <Card elevation="flat" className="divide-y-[0.5px] divide-line">
                  {data.duplicateGroups.slice(0, 3).map((group) => (
                    <div key={group.gitRemote} className="p-4">
                      <div className="flex items-center gap-2">
                        <Copy className="h-[15px] w-[15px] shrink-0 text-warn" />
                        <span className="mono min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                          {group.gitRemote}
                        </span>
                        <span className="shrink-0 text-[13px] tabular text-ink-4">
                          {group.count} copies · {formatBytes(group.wastedSize)} extra
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 pl-6">
                        {group.projects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="mono block truncate text-[13px] text-ink-4 transition-colors hover:text-accent-ink"
                          >
                            {prettyPath(p.path)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </Card>
              </Section>
            )}
          </div>

          {/* ---- Middle column ---------------------------------------- */}
          <div className="space-y-6 2xl:col-span-4">
            <Section title="Backup activity" description="Snapshots per week, last 12 weeks.">
              <Card className="p-5" elevation="flat">
                <div className="flex h-[72px] items-end gap-[3px]">
                  {data.backupSummary.weeks.map((week) => (
                    <div
                      key={week.weekStart}
                      className="group relative flex-1"
                      title={`${week.count} in the week of ${new Date(week.weekStart).toLocaleDateString()}`}
                    >
                      <div
                        className={cn(
                          'w-full rounded-[3px] transition-[height,background-color] duration-500 ease-[var(--ease-standard)]',
                          week.count > 0 ? 'bg-accent' : 'bg-surface-3'
                        )}
                        style={{ height: Math.max(4, (week.count / weekMax) * 72) }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex justify-between text-[12px] text-ink-4">
                  <span>12 weeks ago</span>
                  <span>This week</span>
                </div>
              </Card>
            </Section>

            {data.languages.length > 0 && (
              <Section title="Composition">
                <Card className="p-5" elevation="flat">
                  <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                    {data.languages.slice(0, 8).map((lang) => (
                      <div
                        key={lang.name}
                        style={{
                          width: `${(lang.count / Math.max(1, langTotal)) * 100}%`,
                          backgroundColor: getLanguageColor(lang.name),
                        }}
                        title={`${lang.name}: ${lang.count}`}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {data.languages.slice(0, 5).map((lang) => (
                      <li key={lang.name}>
                        <Link
                          href={`/projects?language=${encodeURIComponent(lang.name)}`}
                          className="flex items-center gap-2.5 text-[14px] text-ink-2 transition-colors hover:text-accent-ink"
                        >
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: getLanguageColor(lang.name) }}
                          />
                          <span className="min-w-0 flex-1 truncate">{lang.name}</span>
                          <span className="tabular text-ink-4">{lang.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {data.frameworks.length > 0 && (
                    <p className="mt-4 border-t-[0.5px] border-line pt-3 text-[13.5px] text-ink-4">
                      Top frameworks:{' '}
                      <span className="text-ink-3">
                        {data.frameworks.slice(0, 3).map((f) => f.name).join(', ')}
                      </span>
                    </p>
                  )}
                </Card>
              </Section>
            )}

          </div>

          {/* ---- Right column ----------------------------------------- */}
          <div className="space-y-6 lg:col-span-3 2xl:col-span-3">
            {/* Disk. The number comes from the Storage page's cached scan, so
                this tile is an invitation when there is nothing cached yet. */}
            <Section title="Disk" description="Dependency trees, build output and caches.">
              <Card className="p-5" elevation="flat">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-accent-tint">
                    <HardDrive className="h-5 w-5 text-accent-ink" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[24px] font-semibold leading-none tracking-[-0.025em] tabular text-ink">
                      {reclaim ? formatBytes(reclaim.totalReclaimable) : '—'}
                    </div>
                    <div className="mt-1 text-[13.5px] text-ink-3">
                      {reclaim ? 'reclaimable' : 'not scanned yet'}
                    </div>
                  </div>
                </div>
                <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                  <Link href="/storage">
                    {reclaim ? 'Review and free it' : 'Scan my library'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Card>
            </Section>

            {(data.recent.length > 0 || data.recentlyModified.length > 0) && (
              <Section title="Pick up where you left off">
                <Card elevation="flat" className="overflow-hidden">
                  {continueList.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group flex items-center gap-3 border-b-[0.5px] border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-3"
                    >
                      <Clock className="h-[14px] w-[14px] shrink-0 text-ink-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium text-ink">{project.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-4">
                          {formatRelativeTime(project.when)}
                        </span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-5 transition-colors group-hover:text-accent-ink" />
                    </Link>
                  ))}
                </Card>
              </Section>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Fact({
  label,
  value,
  hint,
  hintTone,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'bad';
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-4">{label}</div>
      <div className="mt-1 text-[21px] font-semibold tabular tracking-[-0.02em] text-ink">{value}</div>
      {hint && (
        <div className={cn('mt-0.5 text-[13px]', hintTone === 'bad' ? 'text-bad' : 'text-ink-4')}>{hint}</div>
      )}
    </div>
  );
}
