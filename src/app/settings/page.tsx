'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
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
import { Settings, Cloud, Shield, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [backupPath, setBackupPath] = useState('/tmp/codeshelf-backups');
  const [defaultProvider, setDefaultProvider] = useState('local');
  const [autoBackup, setAutoBackup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-violet-400" />
            <h1 className="text-[28px] font-semibold tracking-tight leading-none">Settings</h1>
          </div>
          <p className="text-[13px] text-zinc-500 mt-1 mb-8">Configure backup storage, preferences, and app behavior</p>

          <div className="space-y-5">
            <Card className="p-5 bg-zinc-900/80 border-zinc-800">
              <div className="flex items-center gap-2.5 mb-5">
                <Cloud className="w-4 h-4 text-sky-400" />
                <div>
                  <h3 className="text-[14px] font-semibold">Backup Storage</h3>
                  <p className="text-[11.5px] text-zinc-500">Configure where project backups are stored</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-zinc-500 mb-1.5 block">Default Backup Location</label>
                  <Input
                    value={backupPath}
                    onChange={(e) => setBackupPath(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-[13px] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-zinc-500 mb-1.5 block">Storage Provider</label>
                  <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="google-drive" disabled>Google Drive (Coming Soon)</SelectItem>
                      <SelectItem value="s3" disabled>Amazon S3 (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-zinc-800">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-[13px] font-medium">Auto Backup</p>
                    <p className="text-[11.5px] text-zinc-500">Automatically backup projects weekly</p>
                  </div>
                  <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                {saved ? (
                  <><CheckCircle className="w-4 h-4" /> Saved</>
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
    </div>
  );
}