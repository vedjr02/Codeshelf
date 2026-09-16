'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { getLanguageColor, getFrameworkColor, formatRelativeTime } from '@/lib/utils';
import {
  FolderGit2,
  HardDrive,
  Star,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Layers,
  Boxes,
  Flame,
  Clock,
  Sparkles,
  FolderOpen,
  FolderSearch,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  totalSize: number;
  languages: Array<{ language: string; count: number }>;
  frameworks: Array<{ framework: string; count: number }>;
  recentlyOpened: Array<{
    id: string;
    name: string;
    language?: string;
    lastOpened?: string;
    path: string;
  }>;
  recentlyModified: Array<{
    id: string;
    name: string;
    language?: string;
    lastModified?: string;
    path: string;
  }>;
  projectsNeedingBackup: Array<{
    id: string;
    name: string;
    lastModified?: string;
    lastBackup?: string | null;
  }>;
  duplicateGroups: Array<{
    type: string;
    gitRemote: string;
    count: number;
    projects: Array<{
      id: string;
      name: string;
      path: string;
    }>;
  }>;
}

// Animated counter that eases into the final value
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  accent: string;
  delay?: number;
}) {
  const count = useCountUp(value);
  return (
    <Card
      className="relative overflow-hidden p-6 bg-white/[0.06] border-white/[0.13] hover:bg-white/[0.06] hover:border-white/[0.16] transition-all duration-300 animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon className="w-[22px] h-[22px]" />
        </div>
        <span className="w-2 h-2 rounded-full bg-white/[0.12]" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[40px] font-semibold tracking-tight leading-none tabular-nums">
          {count}
        </span>
        {unit && <span className="text-[15px] text-[#9a9aa3] font-medium">{unit}</span>}
      </div>
      <div className="text-[13px] text-[#9a9aa3] mt-2 font-medium">{label}</div>
    </Card>
  );
}

function BackupRing({ percent }: { percent: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative w-[92px] h-[92px]">
      <svg className="w-[92px] h-[92px] -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
        />
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="#30d158"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[22px] font-semibold tabular-nums tracking-tight">{percent}%</span>
      </div>
    </div>
  );
}

function LanguageBar({ name, count, max }: { name: string; count: number; max: number }) {
  const color = getLanguageColor(name);
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="group/lb">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full lang-dot shrink-0"
            style={{ color, backgroundColor: color }}
          />
          <span className="text-[14px] text-white/80 group-hover/lb:text-white transition-colors truncate">{name}</span>
        </div>
        <span className="text-[13px] text-white/35 group-hover/lb:text-white/60 transition-colors tabular-nums">{count}</span>
      </div>
      <div className="h-[6px] rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8 text-[#ff453a]" />}
          title="Failed to load dashboard"
          description={error}
          action={
            <Button onClick={fetchStats} variant="secondary">
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!stats) return null;

  // First-run onboarding: the library is empty — show a real getting-started flow
  if (stats.totalProjects === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10">
          <div className="flex items-end justify-between mb-10 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2997ff]/80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">
                Welcome to <span className="text-gradient">CodeShelf</span>
              </h1>
              <p className="text-[16px] text-[#9a9aa3]">Your shelf is empty — let&apos;s fill it.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
            {[
              {
                step: '1',
                icon: FolderSearch,
                color: '#2997ff',
                title: 'Scan a folder',
                body: 'Point CodeShelf at your projects directory. It finds repos and detects languages, frameworks and git state automatically.',
                href: '/import',
                cta: 'Scan now',
              },
              {
                step: '2',
                icon: FolderKanban,
                color: '#ff9f0a',
                title: 'Organize',
                body: 'Group related projects into collections and tag them so everything is findable later.',
                href: '/collections',
                cta: 'Create collections',
              },
              {
                step: '3',
                icon: ShieldCheck,
                color: '#30d158',
                title: 'Protect your work',
                body: 'Take zip snapshots of any project in one click — stored locally, restorable anytime.',
                href: '/backups',
                cta: 'See backups',
              },
            ].map((step) => (
              <Card
                key={step.step}
                className="group relative overflow-hidden p-7 bg-white/[0.06] border-white/[0.13] hover:bg-white/[0.06] hover:border-white/[0.16] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                    style={{ backgroundColor: `${step.color}14`, color: step.color }}
                  >
                    <step.icon className="w-[22px] h-[22px]" />
                  </div>
                  <span
                    className="text-[44px] font-bold tracking-tighter leading-none select-none"
                    style={{ color: `${step.color}2e` }}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight mb-2">{step.title}</h3>
                <p className="text-[13.5px] text-[#9a9aa3] leading-relaxed mb-6">{step.body}</p>
                <Link href={step.href}>
                  <Button variant="secondary" size="sm" className="rounded-full gap-1.5 group-hover:bg-white/[0.12] transition-colors">
                    {step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>

          <p className="text-center text-[13px] text-white/30 mt-10 animate-fade">
            Tip: press <kbd className="text-[11px] border border-white/12 rounded-md px-1.5 py-0.5 mx-0.5">⌘K</kbd> anywhere to search or jump around.
          </p>
        </div>
      </div>
    );
  }

  const backupPercent = stats.totalProjects > 0
    ? Math.round(((stats.totalProjects - stats.projectsNeedingBackup.length) / stats.totalProjects) * 100)
    : 100;

  const langMax = Math.max(1, ...stats.languages.map((l) => l.count));
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-10 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2997ff]/80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">
                {greeting}, <span className="text-gradient">Developer</span>
              </h1>
              <p className="text-[16px] text-[#9a9aa3]">
                Your project library at a glance
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/projects?sortBy=lastOpened" className="hidden md:flex items-center gap-2 text-[14px] text-[#9a9aa3] hover:text-white transition-colors">
                <Clock className="w-4 h-4" />
                Recently viewed
              </Link>
              <Link href="/import">
                <Button size="lg" className="gap-2 rounded-full px-6">
                  <Plus className="w-[18px] h-[18px]" />
                  Import
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8 stagger">
            <StatCard
              label="Projects in library"
              value={stats.totalProjects}
              icon={FolderGit2}
              accent="#2997ff"
              delay={0}
            />
            <StatCard
              label="Total storage used"
              value={Math.round(stats.totalSize / (1024 * 1024))}
              unit="MB"
              icon={HardDrive}
              accent="#30d158"
              delay={60}
            />
            <StatCard
              label="Languages detected"
              value={stats.languages.length}
              icon={Layers}
              accent="#ff9f0a"
              delay={120}
            />
            <StatCard
              label="Frameworks detected"
              value={stats.frameworks.length}
              icon={Boxes}
              accent="#64d2ff"
              delay={180}
            />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-3 gap-8">
            {/* Left — 2 cols */}
            <div className="col-span-3 lg:col-span-2 space-y-8">
              {/* Language + Framework distribution */}
              <Card className="p-8 bg-white/[0.06] border-white/[0.13] animate-rise" style={{ animationDelay: '220ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-semibold tracking-tight">Tech Distribution</h2>
                  <span className="text-[12px] text-white/35 font-mono">{stats.languages.length} langs · {stats.frameworks.length} frameworks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="space-y-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-1">Languages</div>
                    {stats.languages.length === 0 ? (
                      <p className="text-[14px] text-[#9a9aa3]">No languages detected yet</p>
                    ) : (
                      stats.languages.slice(0, 6).map((l) => (
                        <LanguageBar key={l.language} name={l.language} count={l.count} max={langMax} />
                      ))
                    )}
                  </div>
                  <div className="space-y-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-1">Frameworks</div>
                    {stats.frameworks.length === 0 ? (
                      <p className="text-[14px] text-[#9a9aa3]">No frameworks detected yet</p>
                    ) : (
                      stats.frameworks.slice(0, 6).map((f) => {
                        const c = getFrameworkColor(f.framework) || '#2997ff';
                        const pct = (f.count / Math.max(1, ...stats.frameworks.map((x) => x.count))) * 100;
                        return (
                          <div key={f.framework} className="group/lb">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[14px] text-white/80 group-hover/lb:text-white transition-colors">{f.framework}</span>
                              <span className="text-[13px] text-white/35 tabular-nums">{f.count}</span>
                            </div>
                            <div className="h-[6px] rounded-full bg-white/[0.07] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: c, opacity: 0.85 }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>

              {/* Recently Opened */}
              <Card className="p-8 bg-white/[0.06] border-white/[0.13] animate-rise" style={{ animationDelay: '280ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[20px] font-semibold tracking-tight flex items-center gap-2.5">
                    <Flame className="w-5 h-5 text-[#ff9f0a]" />
                    Recently Opened
                  </h2>
                  <Link href="/projects?sortBy=lastOpened" className="text-[13px] text-[#2997ff] hover:text-white flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {stats.recentlyOpened.length === 0 ? (
                  <EmptyState
                    title="No projects opened yet"
                    description="Import your first project to see it here"
                    action={
                      <Link href="/import">
                        <Button size="sm" variant="secondary">
                          <Plus className="w-4 h-4 mr-1" />
                          Import Project
                        </Button>
                      </Link>
                    }
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-1">
                    {stats.recentlyOpened.slice(0, 5).map((project) => {
                      const lc = project.language ? getLanguageColor(project.language) : '#9a9aa3';
                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="group flex items-center gap-4 p-3 rounded-[14px] hover:bg-white/[0.05] transition-colors"
                        >
                          <div
                            className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                            style={{ backgroundColor: `${lc}14`, color: lc }}
                          >
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-medium truncate group-hover:text-white transition-colors">{project.name}</span>
                              {project.language && (
                                <span className="hidden sm:inline-flex w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lc }} />
                              )}
                            </div>
                            <p className="text-[12px] text-[#9a9aa3] truncate font-mono">{project.path}</p>
                          </div>
                          <span className="text-[12px] text-white/30 shrink-0 tabular-nums">
                            {project.lastOpened ? formatRelativeTime(project.lastOpened) : '—'}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Duplicates */}
              {stats.duplicateGroups.length > 0 && (
                <Card className="p-8 bg-white/[0.06] border-[#ff9f0a]/20 animate-rise" style={{ animationDelay: '340ms' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-[12px] bg-[#ff9f0a]/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-[#ff9f0a]" />
                    </div>
                    <div>
                      <h2 className="text-[20px] font-semibold tracking-tight">Duplicate Projects</h2>
                      <p className="text-[12px] text-white/40">Multiple local copies of the same remote</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {stats.duplicateGroups.slice(0, 3).map((group, idx) => (
                      <div key={idx} className="p-4 rounded-[14px] bg-[#ff9f0a]/[0.06] border border-[#ff9f0a]/15">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[14px] text-white/80 font-medium">{group.count} copies of the same remote</span>
                          <Badge variant="warning" className="text-[11px]">{group.gitRemote || 'Unknown'}</Badge>
                        </div>
                        <div className="space-y-1">
                          {group.projects.slice(0, 3).map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className="text-[13px] text-white/45 hover:text-[#ff9f0a] block truncate font-mono transition-colors"
                            >
                              {p.name} — {p.path}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right — 1 col */}
            <div className="col-span-3 lg:col-span-1 space-y-8">
              {/* Backup health */}
              <Card className="p-8 bg-white/[0.06] border-white/[0.13] animate-rise" style={{ animationDelay: '250ms' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-[#30d158]/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#30d158]" />
                  </div>
                  <h2 className="text-[20px] font-semibold tracking-tight">Backup Health</h2>
                </div>
                <div className="flex items-center gap-6">
                  <BackupRing percent={backupPercent} />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#9a9aa3]">Protected</span>
                      <span className="text-[15px] font-semibold text-[#30d158]">{stats.totalProjects - stats.projectsNeedingBackup.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#9a9aa3]">At risk</span>
                      <span className="text-[15px] font-semibold text-[#ff9f0a]">{stats.projectsNeedingBackup.length}</span>
                    </div>
                    <div className="hairline my-1" />
                    <div className="flex items-center gap-2 text-[12px] text-white/35">
                      <FolderGit2 className="w-3.5 h-3.5" />
                      {stats.totalProjects} total projects
                    </div>
                  </div>
                </div>
              </Card>

              {/* Needs backup */}
              <Card className="p-8 bg-white/[0.06] border-white/[0.13] animate-rise" style={{ animationDelay: '310ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[20px] font-semibold tracking-tight flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#ff9f0a] animate-pulse-soft" />
                    Needs Backup
                  </h2>
                  <span className="w-7 h-7 rounded-[10px] bg-white/[0.06] flex items-center justify-center text-[12px] text-white/60 tabular-nums">
                    {stats.projectsNeedingBackup.length}
                  </span>
                </div>
                {stats.projectsNeedingBackup.length === 0 ? (
                  <p className="text-[14px] text-[#9a9aa3] py-2">All projects are protected. Nice work. ✨</p>
                ) : (
                  <div className="space-y-1">
                    {stats.projectsNeedingBackup.slice(0, 4).map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="flex items-center justify-between p-3 rounded-[12px] hover:bg-white/[0.05] group transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium truncate">{project.name}</p>
                          <p className="text-[12px] text-[#ff9f0a]/70 mt-0.5">
                            {project.lastBackup ? `Last backup ${formatRelativeTime(project.lastBackup)}` : 'Never backed up'}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#ff9f0a]/70 shrink-0 ml-2 transition-all opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Quick actions */}
              <Card className="p-8 bg-white/[0.06] border-white/[0.13] animate-rise" style={{ animationDelay: '370ms' }}>
                <h2 className="text-[20px] font-semibold tracking-tight mb-5">Quick Actions</h2>
                <div className="space-y-2">
                  <Link href="/import" className="group flex items-center gap-3.5 p-3 rounded-[12px] hover:bg-white/[0.05] transition-colors">
                    <div className="w-10 h-10 rounded-[12px] bg-[#0a84ff]/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-[#2997ff]" />
                    </div>
                    <span className="text-[15px] font-medium">Import Project</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                  <Link href="/projects?isFavorite=true" className="group flex items-center gap-3.5 p-3 rounded-[12px] hover:bg-white/[0.05] transition-colors">
                    <div className="w-10 h-10 rounded-[12px] bg-[#ffd60a]/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-[#ffd60a]" />
                    </div>
                    <span className="text-[15px] font-medium">View Favorites</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                  <Link href="/collections" className="group flex items-center gap-3.5 p-3 rounded-[12px] hover:bg-white/[0.05] transition-colors">
                    <div className="w-10 h-10 rounded-[12px] bg-[#64d2ff]/10 flex items-center justify-center">
                      <Boxes className="w-5 h-5 text-[#64d2ff]" />
                    </div>
                    <span className="text-[15px] font-medium">Manage Collections</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
}