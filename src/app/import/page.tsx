'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { formatBytes, getLanguageColor } from '@/lib/utils';
import { FolderSearch, CheckCircle, AlertCircle, Scan, FolderGit2 } from 'lucide-react';
import Link from 'next/link';

interface ScannedProject {
  path: string;
  name: string;
  language?: string | null;
  framework?: string | null;
  isGitRepo: boolean;
  size: number;
}

export default function ImportPage() {
  const router = useRouter();
  const [folderPath, setFolderPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProjects, setScannedProjects] = useState<ScannedProject[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    try {
      setIsScanning(true);
      setError(null);
      setScannedProjects([]);
      setSelectedPaths(new Set());

      const res = await fetch('/api/import/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan directory');

      setScannedProjects(data.projects);
      setSelectedPaths(new Set(data.projects.map((p: ScannedProject) => p.path)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const handleImport = async () => {
    if (selectedPaths.size === 0) return;

    try {
      setIsImporting(true);
      const pathsToImport = Array.from(selectedPaths);
      for (const path of pathsToImport) {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: path }),
        });
      }
      router.push('/projects');
    } catch (err) {
      setError('Failed to import some projects');
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          <Link href="/projects" className="inline-flex items-center text-[13px] text-zinc-500 hover:text-white mb-6 transition-colors">
            ← Back to Projects
          </Link>

          <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1">Import Projects</h1>
          <p className="text-[13px] text-zinc-500 mt-1 mb-8">Scan a folder to discover and import your coding projects</p>

          <Card className="mb-8 p-5 bg-zinc-900/80 border-zinc-800">
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <FolderSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="/Users/username/Developer"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-[13px] font-mono"
                  disabled={isScanning || isImporting}
                />
              </div>
              <Button type="submit" disabled={isScanning || isImporting || !folderPath.trim()} className="shrink-0 gap-1.5">
                <Scan className="w-4 h-4" />
                {isScanning ? 'Scanning...' : 'Scan Folder'}
              </Button>
            </form>

            {error && (
              <div className="mt-4 flex items-center gap-2.5 text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </Card>

          {isScanning ? (
            <LoadingState message="Scanning directories for projects..." />
          ) : scannedProjects.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-tight">Found {scannedProjects.length} Projects</h2>
                  <p className="text-[13px] text-zinc-500">{selectedPaths.size} selected for import</p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={selectedPaths.size === 0 || isImporting}
                  size="sm"
                  className="gap-1.5"
                >
                  Import ({selectedPaths.size})
                </Button>
              </div>

              <div className="space-y-2">
                {scannedProjects.map((project) => {
                  const isSelected = selectedPaths.has(project.path);
                  const langColor = getLanguageColor(project.language);
                  return (
                    <div
                      key={project.path}
                      onClick={() => !isImporting && handleToggleSelect(project.path)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                        isSelected ? 'border-violet-500/40 bg-violet-500/10' : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-semibold tracking-tight">{project.name}</span>
                        <p className="text-[11.5px] text-zinc-500 font-mono truncate">{project.path}</p>
                      </div>
                      <span className="text-[11.5px] text-zinc-500 tabular-nums shrink-0">{formatBytes(project.size)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : folderPath && !isScanning ? (
            <EmptyState
              icon={<FolderGit2 className="w-8 h-8 text-zinc-500" />}
              title="No projects found"
              description="No coding projects were detected in the selected folder."
              className="py-16"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}