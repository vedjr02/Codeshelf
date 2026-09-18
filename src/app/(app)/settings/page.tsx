'use client';

import * as React from 'react';
import { AlertTriangle, Check, HardDrive, Loader2 } from 'lucide-react';
import { PageShell, Section } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, IconInput } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/states';
import { AppearanceToggle } from '@/components/appearance-toggle';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface SettingsData {
  backupPath: string;
  defaultProvider: string;
  autoBackup: boolean;
  notifications: boolean;
}

const DEFAULTS: SettingsData = {
  backupPath: '/tmp/codeshelf-backups',
  defaultProvider: 'local',
  autoBackup: false,
  notifications: true,
};

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = React.useState<SettingsData>(DEFAULTS);
  const [saved, setSaved] = React.useState<SettingsData>(DEFAULTS);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  React.useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Could not load your settings');
        const data = (await res.json()) as SettingsData;
        if (signal.cancelled) return;
        const next: SettingsData = {
          backupPath: data.backupPath || DEFAULTS.backupPath,
          defaultProvider: data.defaultProvider || DEFAULTS.defaultProvider,
          autoBackup: data.autoBackup ?? DEFAULTS.autoBackup,
          notifications: data.notifications ?? DEFAULTS.notifications,
        };
        setSettings(next);
        setSaved(next);
        setProblem(null);
      } catch (err) {
        if (!signal.cancelled) setProblem(err instanceof Error ? err.message : 'Could not load your settings');
      } finally {
        if (!signal.cancelled) setLoaded(true);
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  const update = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!settings.backupPath.trim()) {
      setProblem('A backup location is required.');
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, backupPath: settings.backupPath.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not save your settings');
      setSaved({ ...settings, backupPath: settings.backupPath.trim() });
      success('Settings saved');
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not save your settings');
      toastError('Could not save settings', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <PageShell title="Settings" width="narrow">
        <div className="space-y-5" aria-busy="true">
          <Skeleton className="h-[180px] w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-[150px] w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-[200px] w-full rounded-[var(--radius-xl)]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Settings"
      width="narrow"
      subtitle="Where snapshots go, how CodeShelf looks, and what it does on its own."
      actions={
        <Button variant="primary" size="pill" onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? null : <Check className="h-4 w-4" />}
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </Button>
      }
    >
      {problem && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-bad-tint px-3.5 py-3 text-[14px] text-bad">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>{problem}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* ---- Appearance ---------------------------------------------- */}
        <Section title="Appearance" description="CodeShelf follows your system by default.">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">Theme</p>
                <p className="mt-0.5 text-[13.5px] text-ink-3">
                  Light, dark, or whatever your Mac is doing right now.
                </p>
              </div>
              <div className="w-[200px] shrink-0">
                <AppearanceToggle size="md" />
              </div>
            </div>
          </Card>
        </Section>

        {/* ---- Snapshots ----------------------------------------------- */}
        <Section title="Snapshots" description="Where archives are written, and what gets left out.">
          <Card className="divide-y-[0.5px] divide-line">
            <div className="p-5">
              <Field
                label="Backup location"
                htmlFor="backup-path"
                hint="Point this somewhere durable — an external drive or a synced folder. The default lives in /tmp and your operating system may clear it."
              >
                <IconInput
                  id="backup-path"
                  icon={<HardDrive />}
                  value={settings.backupPath}
                  onChange={(event) => update('backupPath', event.target.value)}
                  placeholder="/Volumes/Backup/codeshelf"
                  className="mono"
                />
              </Field>
              {settings.backupPath.trim().startsWith('/tmp') && (
                <p className="mt-2.5 flex items-start gap-2 text-[13.5px] text-warn">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  Snapshots in /tmp can be deleted by macOS on restart. Choose a permanent location.
                </p>
              )}
            </div>

            <div className="p-5">
              <Field label="Storage provider" htmlFor="provider">
                <Select value={settings.defaultProvider} onValueChange={(value) => update('defaultProvider', value)}>
                  <SelectTrigger id="provider" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">This Mac</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <p className="mt-2 text-[13.5px] text-ink-4">
                Everything stays on this machine. Cloud providers are not wired up yet.
              </p>
            </div>

            <Toggle
              label="Automatic weekly snapshots"
              description="Not yet enforced — the preference is stored, but nothing schedules it."
              checked={settings.autoBackup}
              onChange={(value) => update('autoBackup', value)}
              pending
            />

            <Toggle
              label="Notify when a snapshot finishes"
              description="Shows a toast when a backup completes or fails."
              checked={settings.notifications}
              onChange={(value) => update('notifications', value)}
            />

            <div className="p-5">
              <p className="text-[15px] font-medium text-ink">Always excluded</p>
              <p className="mt-0.5 text-[13.5px] text-ink-3">
                These never enter an archive, which is why snapshots stay small.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['node_modules', '.git', 'dist', 'build', '.next', 'target', '__pycache__', '.venv', 'coverage', '.cache'].map(
                  (pattern) => (
                    <span
                      key={pattern}
                      className="mono rounded-full bg-surface-3 px-2 py-0.5 text-[12.5px] text-ink-3"
                    >
                      {pattern}
                    </span>
                  )
                )}
              </div>
            </div>
          </Card>
        </Section>

        {/* ---- About --------------------------------------------------- */}
        <Section title="About">
          <Card className="p-5">
            <dl className="space-y-0">
              {[
                { k: 'Version', v: '1.0' },
                { k: 'Storage', v: 'PostgreSQL, local' },
                { k: 'Framework', v: 'Next.js 16 · React 19' },
                { k: 'Archives', v: 'Zip, written by this machine' },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-line py-2.5 last:border-b-0"
                >
                  <dt className="text-[14px] text-ink-4">{row.k}</dt>
                  <dd className="text-[14px] font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-4">
              CodeShelf runs entirely on this machine. Your library, your notes and your archives never leave it.
            </p>
          </Card>
        </Section>
      </div>
    </PageShell>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  pending,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className={cn('text-[15px] font-medium text-ink')}>
          {label}
          {pending && (
            <span className="ml-2 rounded-full bg-surface-3 px-1.5 py-0.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-4">
              Not active
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-3">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
