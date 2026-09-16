'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Cloud,
  Shield,
  Palette,
  Bell,
  FolderSync,
  HardDrive,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface SettingsData {
  backupPath: string;
  defaultProvider: string;
  autoBackup: boolean;
  notifications: boolean;
}

export default function SettingsPage() {
  const [backupPath, setBackupPath] = useState('/tmp/codeshelf-backups');
  const [defaultProvider, setDefaultProvider] = useState('local');
  const [autoBackup, setAutoBackup] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data: SettingsData = await res.json();
        if (cancelled) return;
        setBackupPath(data.backupPath || '/tmp/codeshelf-backups');
        setDefaultProvider(data.defaultProvider || 'local');
        setAutoBackup(data.autoBackup ?? false);
        setNotifications(data.notifications ?? true);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        if (!cancelled) setInitialLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (autoBackup && !backupPath.trim()) {
      setLoadError('A backup location is required when auto backup is enabled');
      return;
    }
    setIsSaving(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPath: backupPath.trim(), defaultProvider, autoBackup, notifications }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save settings');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!initialLoaded) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen">
      <div className="p-5 sm:p-10 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10 animate-rise">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2997ff]/80 flex items-center gap-1.5 mb-3">
              <Settings className="w-4 h-4" />
              Configuration
            </span>
            <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">
              Settings
            </h1>
            <p className="text-[16px] text-[#9a9aa3] mt-1">
              Configure backup storage, preferences, and app behavior
            </p>
          </div>

          {loadError && (
            <div className="flex items-start gap-2.5 text-[13px] text-[#ff6961] bg-[#ff453a]/[0.08] border border-[#ff453a]/20 p-3.5 rounded-[12px] mb-6 animate-fade">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {loadError}
            </div>
          )}

          <div className="space-y-7 stagger">
            {/* Backup Settings */}
            <Card className="p-7 bg-white/[0.06] border-white/[0.13]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight">Backup Storage</h3>
                  <p className="text-[11.5px] text-white/35">Configure where project backups are stored</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Default Backup Location</label>
                  <Input
                    value={backupPath}
                    onChange={(e) => setBackupPath(e.target.value)}
                    placeholder="/path/to/backups"
                    className="rounded-xl bg-white/[0.045] border-white/[0.11] text-[13px] font-mono"
                  />
                  <p className="text-[11px] text-white/30 mt-1.5">Local directory where project backups will be stored</p>
                </div>

                <div>
                  <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Storage Provider</label>
                  <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                    <SelectTrigger className="rounded-xl bg-white/[0.045] border-white/[0.11] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f1f23] border-white/[0.14]">
                      <SelectItem value="local">
                        <span className="flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-white/40" />
                          Local Storage
                        </span>
                      </SelectItem>
                      <SelectItem value="google-drive" disabled>
                        <span className="flex items-center gap-2 text-white/30">
                          Google Drive (Coming Soon)
                        </span>
                      </SelectItem>
                      <SelectItem value="s3" disabled>
                        <span className="flex items-center gap-2 text-white/30">
                          Amazon S3 (Coming Soon)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <FolderSync className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[13px] font-medium">Auto Backup</p>
                      <p className="text-[11.5px] text-white/35">Automatically backup projects weekly</p>
                    </div>
                  </div>
                  <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                </div>
              </div>
            </Card>

            {/* Preferences */}
            <Card className="p-7 bg-white/[0.06] border-white/[0.13]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#2997ff]/10 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-[#2997ff]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight">Preferences</h3>
                  <p className="text-[11.5px] text-white/35">Customize app behavior and appearance</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[13px] font-medium">Desktop Notifications</p>
                      <p className="text-[11.5px] text-white/35">Get notified when backups complete</p>
                    </div>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[13px] font-medium">Exclude Patterns</p>
                      <p className="text-[11.5px] text-white/35">Default patterns to exclude from backups</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl text-[12.5px]">
                    Edit
                  </Button>
                </div>
              </div>
            </Card>

            {/* About */}
            <Card className="p-7 bg-white/[0.06] border-white/[0.13]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight">About</h3>
                  <p className="text-[11.5px] text-white/35">App version and system info</p>
                </div>
              </div>
              <div className="space-y-0">
                {[
                  { k: 'Version', v: '1.0.0' },
                  { k: 'Database', v: 'PostgreSQL' },
                  { k: 'Framework', v: 'Next.js 16' },
                  { k: 'Runtime', v: 'Node.js' },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-[12.5px] text-white/40">{k}</span>
                    <span className="text-[12.5px] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Save */}
            <div className="flex justify-end animate-rise" style={{ animationDelay: '0.3s' }}>
              <Button
                onClick={handleSave}
                disabled={isSaving || saved}
                className="rounded-full gap-1.5 px-7 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </>
                ) : isSaving ? (
                  'Saving...'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}
