'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { formatBytes, getLanguageColor } from '@/lib/utils';
import {
  FolderSearch,
  CheckCircle,
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

    setIsImporting(true);
    setError(null);
    setImportProgress(0);
    const pathsToImport = Array.from(selectedPaths);
    const failed: string[] = [];

    for (let i = 0; i < pathsToImport.length; i++) {
      const path = pathsToImport[i];
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: path }),
        });
        if (!res.ok) failed.push(path.split('/').pop() || path);
      } catch {
        failed.push(path.split('/').pop() || path);
      }
      setImportProgress(Math.round(((i + 1) / pathsToImport.length) * 100));
    }

    if (failed.length === 0) {
      router.push('/projects');
      return;
    }

    setError(
      failed.length === 1
        ? `Failed to import "${failed[0]}". It may already be in your library.`
        : `Failed to import ${failed.length} projects: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`
    );
    setIsImporting(false);
  };

  return (
    <div className="min-h-screen">
      <div className="p-5 sm:p-10 max-w-7xl mx-auto">
          {/* Back */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[14px] text-[#86868b] hover:text-white mb-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          {/* Header */}
          <div className="mb-10 animate-rise">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#30d158]/80 flex items-center gap-1.5 mb-3">
              <Scan className="w-4 h-4" />
              Import
            </span>
            <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">
              Import Projects
            </h1>
            <p className="text-[16px] text-[#86868b] mt-1">
              Scan a folder to discover and import your coding projects
            </p>
          </div>

          {/* Scan Form */}
          <Card className="mb-8 p-7 bg-white/[0.04] border-white/[0.1] animate-rise" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <FolderSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <Input
                  type="text"
                  placeholder="/Users/username/Developer or C:\Users\username\Projects"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="pl-10 font-mono"
                  disabled={isScanning || isImporting}
                />
              </div>
              <Button
                type="submit"
                disabled={isScanning || isImporting || !folderPath.trim()}
                className="shrink-0 gap-2 rounded-full px-6 disabled:opacity-50"
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
            <Card className="mb-8 p-5 border-[#2997ff]/25 bg-[#2997ff]/[0.06] animate-fade">
              <div className="flex items-center justify-between text-[14px] mb-3">
                <span className="text-[#2997ff]">Importing projects...</span>
                <span className="text-[#2997ff] tabular-nums">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
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
                    className="rounded-full gap-1.5 bg-[#30d158] hover:bg-[#40e368] text-white disabled:opacity-50 shadow-[0_4px_20px_-4px_rgba(48,209,88,0.5)]"
                  >
                    <Sparkles className="w-4 h-4" />
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
                          ? 'border-[#2997ff]/35 bg-[#2997ff]/[0.07]'
                          : 'border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.16]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#0a84ff] border-[#0a84ff] text-white'
                          : 'border-white/25'
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
  );
}
