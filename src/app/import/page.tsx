'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { formatBytes, getLanguageColor } from '@/lib/utils';
import {
  FolderSearch,
  CheckCircle,
  Plus,
  ArrowLeft,
  FolderGit2,
  GitBranch,
  AlertCircle,
  Scan,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

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

export default function ImportPage() {
  const router = useRouter();
  const [folderPath, setFolderPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProjects, setScannedProjects] = useState<ScannedProject[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan directory');
      }

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
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  const handleSelectAll = () => {
    if (selectedPaths.size === scannedProjects.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(scannedProjects.map((p) => p.path)));
    }
  };

  const handleImport = async () => {
    if (selectedPaths.size === 0) return;

    try {
      setIsImporting(true);
      const pathsToImport = Array.from(selectedPaths);
      let completed = 0;

      for (const path of pathsToImport) {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: path }),
        });

        completed++;
        setImportProgress(Math.round((completed / pathsToImport.length) * 100));
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
          {/* Back */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[13px] text-white/45 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          {/* Header */}
          <div className="mb-8 animate-rise">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-400/80 flex items-center gap-1.5 mb-2">
              <Scan className="w-3.5 h-3.5" />
              Import
            </span>
            <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1">
              Import Projects
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              Scan a folder to discover and import your coding projects
            </p>
          </div>

          {/* Scan Form */}
          <Card className="mb-8 p-5 bg-white/[0.03] border-white/[0.07] animate-rise" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <FolderSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <Input
                  type="text"
                  placeholder="/Users/username/Developer or C:\Users\username\Projects"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="pl-9 bg-white/[0.045] border-white/[0.08] text-[13px] rounded-xl font-mono"
                  disabled={isScanning || isImporting}
                />
              </div>
              <Button
                type="submit"
                disabled={isScanning || isImporting || !folderPath.trim()}
                className="shrink-0 gap-1.5 rounded-xl bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 hover:from-violet-500/80 hover:to-fuchsia-500/80 text-white shadow-lg shadow-violet-900/40 disabled:opacity-50"
              >
                <Scan className="w-4 h-4" />
                {isScanning ? 'Scanning...' : 'Scan Folder'}
              </Button>
            </form>

            {error && (
              <div className="mt-4 flex items-center gap-2.5 text-[13px] text-red-400 bg-red-500/[0.08] border border-red-500/20 p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </Card>

          {/* Import Progress */}
          {isImporting && (
            <Card className="mb-8 p-5 border-violet-500/20 bg-violet-500/5 animate-fade">
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="text-violet-300">Importing projects...</span>
                <span className="text-violet-400 tabular-nums">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-1.5" />
            </Card>
          )}

          {/* Scanned Results */}
          {isScanning ? (
            <LoadingState message="Scanning directories for projects..." />
          ) : scannedProjects.length > 0 ? (
            <div className="space-y-4 animate-rise" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-tight">
                    Found {scannedProjects.length} Projects
                  </h2>
                  <p className="text-[13px] text-white/40">
                    {selectedPaths.size} selected for import
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={isImporting} className="rounded-xl text-[13px]">
                    {selectedPaths.size === scannedProjects.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedPaths.size === 0 || isImporting}
                    size="sm"
                    className="rounded-xl gap-1.5 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/80 hover:to-teal-500/80 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Import ({selectedPaths.size})
                  </Button>
                </div>
              </div>

              <div className="space-y-2 stagger">
                {scannedProjects.map((project) => {
                  const isSelected = selectedPaths.has(project.path);
                  const langColor = getLanguageColor(project.language);

                  return (
                    <div
                      key={project.path}
                      onClick={() => !isImporting && handleToggleSelect(project.path)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-violet-500/30 bg-violet-500/[0.06]'
                          : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-violet-500 border-violet-500 text-white'
                          : 'border-white/20'
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>

                      {/* Language tile */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${langColor}14` }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full lang-dot" style={{ color: langColor, backgroundColor: langColor }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-semibold tracking-tight truncate">{project.name}</span>
                          {project.language && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium" style={{ backgroundColor: `${langColor}12`, color: langColor }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor }} />
                              {project.language}
                            </span>
                          )}
                          {project.framework && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.06] text-white/50">
                              {project.framework}
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-white/35 font-mono truncate">{project.path}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[11.5px] text-white/40 shrink-0">
                        <span className="tabular-nums">{formatBytes(project.size)}</span>
                        {project.isGitRepo && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            Git
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : folderPath && !isScanning ? (
            <EmptyState
              icon={<FolderGit2 className="w-8 h-8 text-white/30" />}
              title="No projects found"
              description="No coding projects were detected in the selected folder. Make sure the path contains projects with package files or Git repositories."
              className="py-16"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
