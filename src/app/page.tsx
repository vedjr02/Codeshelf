'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { formatBytes } from '@/lib/utils';
import { FolderGit2, HardDrive, Layers, Boxes } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  totalSize: number;
  languages: Array<{ language: string; count: number }>;
  frameworks: Array<{ framework: string; count: number }>;
  recentlyModified: Array<{
    id: string;
    name: string;
    language?: string;
    lastModified?: string;
    path: string;
  }>;
  projectsNeedingBackup: Array<{ id: string; name: string; lastBackup?: string | null }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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

  if (!stats) return null;

  const statCards = [
    { label: 'Projects', value: stats.totalProjects, icon: FolderGit2 },
    { label: 'Storage', value: formatBytes(stats.totalSize), icon: HardDrive },
    { label: 'Languages', value: stats.languages.length, icon: Layers },
    { label: 'Frameworks', value: stats.frameworks.length, icon: Boxes },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="text-[28px] font-semibold tracking-tight mb-1">Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mb-8">Your project library at a glance</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => (
              <Card key={s.label} className="p-5 bg-zinc-900/80 border-zinc-800">
                <s.icon className="w-5 h-5 text-violet-400 mb-3" />
                <div className="text-[26px] font-semibold tracking-tight tabular-nums">{s.value}</div>
                <div className="text-[12px] text-zinc-500 mt-1">{s.label}</div>
              </Card>
            ))}
          </div>

          <Card className="p-5 bg-zinc-900/80 border-zinc-800 mb-6">
            <h2 className="text-[15px] font-semibold mb-4">Recent Projects</h2>
            {stats.recentlyModified.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Import your first project to get started"
                action={
                  <Link href="/import">
                    <Button size="sm" variant="secondary">Import Project</Button>
                  </Link>
                }
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {stats.recentlyModified.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/60 transition-colors"
                  >
                    <div>
                      <span className="text-[13.5px] font-medium">{p.name}</span>
                      <p className="text-[11px] text-zinc-500 truncate font-mono">{p.path}</p>
                    </div>
                    {p.language && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] bg-zinc-800 text-zinc-400">{p.language}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {stats.projectsNeedingBackup.length > 0 && (
            <Card className="p-5 bg-zinc-900/80 border-amber-900/40">
              <h2 className="text-[15px] font-semibold text-amber-300 mb-3">
                {stats.projectsNeedingBackup.length} project{stats.projectsNeedingBackup.length === 1 ? '' : 's'} need backup
              </h2>
              <div className="space-y-1">
                {stats.projectsNeedingBackup.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex justify-between p-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-[13px]"
                  >
                    <span>{p.name}</span>
                    <span className="text-zinc-500">{p.lastBackup ? 'Stale backup' : 'Never backed up'}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}