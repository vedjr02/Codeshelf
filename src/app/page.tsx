'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { formatBytes, getLanguageColor, getFrameworkColor, formatRelativeTime } from '@/lib/utils';
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
  gradient,
  delay,
}: {
  label: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  accent: string;
  gradient: string;
  delay?: number;
}) {
  const count = useCountUp(value);
  return (
    <Card
      className="relative overflow-hidden group p-5 bg-white/[0.03] border-white/[0.07] hover:border-white/[0.12] transition-all duration-300 animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-[0.07] blur-2xl group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: gradient }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-white/15 group-hover:bg-white/30 transition-colors" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[30px] font-semibold tracking-tight leading-none tabular-nums">
          {count}
        </span>
        {unit && <span className="text-sm text-white/40 font-medium">{unit}</span>}
      </div>
      <div className="text-[12px] text-white/45 mt-1.5 font-medium">{label}</div>
    </Card>
  );
}

function BackupRing({ percent }: { percent: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

function LanguageBar({ name, count, max }: { name: string; count: number; max: number }) {
  const color = getLanguageColor(name);
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="group/lb">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full lang-dot shrink-0"
            style={{ color, backgroundColor: color }}
          />
          <span className="text-[13px] text-white/75 group-hover/lb:text-white transition-colors truncate">{name}</span>
        </div>
        <span className="text-[12px] text-white/35 group-hover/lb:text-white/60 transition-colors tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}b0, ${color}50)` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
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
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
            title="Failed to load dashboard"
            description={error}
            action={
              <Button onClick={fetchStats} variant="secondary">
                Try again
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const backupPercent = stats.totalProjects > 0
    ? Math.round(((stats.totalProjects - stats.projectsNeedingBackup.length) / stats.totalProjects) * 100)
    : 100;

  const langMax = Math.max(1, ...stats.languages.map((l) => l.count));
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-end justify-between mb-8 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-400/80 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1.5">
                {greeting} <span className="text-gradient">Developer</span>
              </h1>
              <p className="text-[13px] text-white/45">
                Your project library at a glance
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/projects?sortBy=lastOpened" className="hidden md:flex items-center gap-1.5 text-[13px] text-white/45 hover:text-white transition-colors">
                <Clock className="w-3.5 h-3.5" />
                Recently viewed
              </Link>
              <Link href="/import">
                <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/40">
                  <Plus className="w-4 h-4" />
                  Import
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
            <StatCard
              label="Projects in library"
              value={stats.totalProjects}
              icon={FolderGit2}
              accent="#c4b5fd"
              gradient="linear-gradient(135deg,#8b5cf6,#6366f1)"
              delay={0}
            />
            <StatCard
              label="Total storage used"
              value={Math.round(stats.totalSize / (1024 * 1024))}
              unit="MB"
              icon={HardDrive}
              accent="#38bdf8"
              gradient="linear-gradient(135deg,#0ea5e9,#22d3ee)"
              delay={60}
            />
            <StatCard
              label="Languages detected"
              value={stats.languages.length}
              icon={Layers}
              accent="#f472b6"
              gradient="linear-gradient(135deg,#ec4899,#d946ef)"
              delay={120}
            />
            <StatCard
              label="Frameworks detected"
              value={stats.frameworks.length}
              icon={Boxes}
              accent="#fbbf24"
              gradient="linear-gradient(135deg,#f59e0b,#f97316)"
              delay={180}
            />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left — 2 cols */}
            <div className="col-span-3 lg:col-span-2 space-y-6">
              {/* Language + Framework distribution */}
              <Card className="p-6 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '220ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold tracking-tight">Tech Distribution</h2>
                  <span className="text-[11px] text-white/35 font-mono">{stats.languages.length} langs · {stats.frameworks.length} frameworks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 mb-3">Languages</div>
                    {stats.languages.length === 0 ? (
                      <p className="text-[13px] text-white/35">No languages detected yet</p>
                    ) : (
                      stats.languages.slice(0, 6).map((l) => (
                        <LanguageBar key={l.language} name={l.language} count={l.count} max={langMax} />
                      ))
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 mb-3">Frameworks</div>
                    {stats.frameworks.length === 0 ? (
                      <p className="text-[13px] text-white/35">No frameworks detected yet</p>
                    ) : (
                      stats.frameworks.slice(0, 6).map((f) => {
                        const c = getFrameworkColor(f.framework) || '#8b5cf6';
                        const pct = (f.count / Math.max(1, ...stats.frameworks.map((x) => x.count))) * 100;
                        return (
                          <div key={f.framework} className="group/lb">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[13px] text-white/75 group-hover/lb:text-white transition-colors">{f.framework}</span>
                              <span className="text-[12px] text-white/35 tabular-nums">{f.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}b8, ${c}50)` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>

              {/* Recently Opened */}
              <Card className="p-6 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '280ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Recently Opened
                  </h2>
                  <Link href="/projects?sortBy=lastOpened" className="text-[12px] text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
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
                    {stats.recentlyOpened.slice(0, 5).map((project, i) => {
                      const lc = project.language ? getLanguageColor(project.language) : '#71717a';
                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="group flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                            style={{ backgroundColor: `${lc}14`, color: lc }}
                          >
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13.5px] font-medium truncate group-hover:text-white transition-colors">{project.name}</span>
                              {project.language && (
                                <span className="hidden sm:inline-flex w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lc }} />
                              )}
                            </div>
                            <p className="text-[11px] text-white/35 truncate font-mono">{project.path}</p>
                          </div>
                          <span className="text-[11px] text-white/30 shrink-0 tabular-nums">
                            {project.lastOpened ? formatRelativeTime(project.lastOpened) : '—'}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Duplicates */}
              {stats.duplicateGroups.length > 0 && (
                <Card className="p-6 bg-white/[0.03] border-orange-500/15 animate-rise" style={{ animationDelay: '340ms' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-tight">Duplicate Projects</h2>
                      <p className="text-[11px] text-white/40">Multiple local copies of the same remote</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {stats.duplicateGroups.slice(0, 3).map((group, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-orange-500/[0.06] border border-orange-500/10">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[13px] text-white/80 font-medium">{group.count} copies of the same remote</span>
                          <Badge variant="warning" className="text-[10px]">{group.gitRemote || 'Unknown'}</Badge>
                        </div>
                        <div className="space-y-1">
                          {group.projects.slice(0, 3).map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className="text-[12px] text-white/45 hover:text-orange-300 block truncate font-mono transition-colors"
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
            <div className="col-span-3 lg:col-span-1 space-y-6">
              {/* Backup health */}
              <Card className="p-6 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '250ms' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h2 className="text-[15px] font-semibold tracking-tight">Backup Health</h2>
                    </div>
                    <BackupRing percent={backupPercent} />
                  </div>
                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/45">Protected</span>
                      <span className="text-[13px] font-medium text-emerald-400">{stats.totalProjects - stats.projectsNeedingBackup.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/45">At risk</span>
                      <span className="text-[13px] font-medium text-amber-400">{stats.projectsNeedingBackup.length}</span>
                    </div>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <div className="flex items-center gap-1.5 text-[11px] text-white/35">
                      <FolderGit2 className="w-3 h-3" />
                      {stats.totalProjects} total projects
                    </div>
                  </div>
                </div>
              </Card>

              {/* Needs backup */}
              <Card className="p-6 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '310ms' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-soft" />
                    Needs Backup
                  </h2>
                  <span className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-[11px] text-white/50 tabular-nums">
                    {stats.projectsNeedingBackup.length}
                  </span>
                </div>
                {stats.projectsNeedingBackup.length === 0 ? (
                  <p className="text-[13px] text-white/40 py-2">All projects are protected. Nice badge for your shelf. ✨</p>
                ) : (
                  <div className="space-y-1">
                    {stats.projectsNeedingBackup.slice(0, 4).map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] group transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate">{project.name}</p>
                          <p className="text-[10.5px] text-amber-400/70 mt-0.5">
                            {project.lastBackup ? `Last backup ${formatRelativeTime(project.lastBackup)}` : 'Never backed up'}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-amber-400/60 shrink-0 ml-2 transition-all opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Quick actions */}
              <Card className="p-6 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '370ms' }}>
                <h2 className="text-[15px] font-semibold tracking-tight mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link href="/import" className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-violet-300" />
                    </div>
                    <span className="text-[13px] font-medium">Import Project</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                  <Link href="/projects?isFavorite=true" className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-300" />
                    </div>
                    <span className="text-[13px] font-medium">View Favorites</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                  <Link href="/collections" className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Boxes className="w-4 h-4 text-sky-300" />
                    </div>
                    <span className="text-[13px] font-medium">Manage Collections</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}