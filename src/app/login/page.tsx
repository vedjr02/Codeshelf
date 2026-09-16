'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderGit2, ShieldCheck, HardDrive, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Is it running?');
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="w-full max-w-[400px] mx-auto animate-rise">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-[14px] bg-white/[0.08] border border-white/10 flex items-center justify-center">
              <FolderGit2 className="w-[22px] h-[22px] text-[#2997ff]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[19px] font-semibold tracking-tight">CodeShelf</span>
              <span className="text-[12.5px] text-[#9a9aa3]">Project Library</span>
            </div>
          </div>

          <h1 className="text-[32px] font-semibold tracking-tight leading-tight mb-2">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-[15px] text-[#9a9aa3] mb-8">
            {isRegister
              ? 'One account for your entire project library.'
              : 'Sign in to your project library.'}
          </p>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-[12px] bg-white/[0.05] border border-white/[0.08] mb-7">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  'h-9 rounded-[9px] text-[13.5px] font-medium transition-all duration-200',
                  mode === m ? 'bg-white/[0.1] text-white shadow-sm' : 'text-[#9a9aa3] hover:text-white'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="animate-fade">
                <label htmlFor="name" className="text-[12.5px] text-white/50 mb-1.5 block font-medium">
                  Name <span className="text-white/25">(optional)</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-[12.5px] text-white/50 mb-1.5 block font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[12.5px] text-white/50 mb-1.5 block font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
              />
            </div>

            {isRegister && (
              <div className="animate-fade">
                <label htmlFor="confirm" className="text-[12.5px] text-white/50 mb-1.5 block font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 text-[13px] text-[#ff6961] bg-[#ff453a]/[0.08] border border-[#ff453a]/20 p-3.5 rounded-[12px] animate-fade">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff453a] shrink-0 mt-[7px]" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-[12px] text-[15px] font-semibold gap-2 mt-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-[12px] text-white/30 mt-8 leading-relaxed">
            CodeShelf runs locally and your library never leaves this machine.
          </p>
        </div>
      </div>

      {/* Right — product panel */}
      <div className="hidden lg:flex w-[44%] relative overflow-hidden border-l border-white/[0.06] items-center justify-center">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 60% at 70% 20%, rgba(41,151,255,0.12), transparent 70%), radial-gradient(60% 50% at 20% 80%, rgba(48,209,88,0.06), transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-[420px] px-12">
          <h2 className="text-[34px] font-semibold tracking-tight leading-[1.15] mb-4">
            Every project.
            <br />
            <span className="text-gradient">One shelf.</span>
          </h2>
          <p className="text-[15px] text-[#9a9aa3] leading-relaxed mb-12">
            Discover, organize, and protect the projects scattered across your
            machine — with local backups that never leave your control.
          </p>

          <div className="space-y-6">
            {[
              {
                icon: Layers,
                color: '#2997ff',
                title: 'Automatic discovery',
                body: 'Scan folders and CodeShelf detects languages, frameworks and git state.',
              },
              {
                icon: HardDrive,
                color: '#30d158',
                title: 'Local zip backups',
                body: 'One-click snapshots with smart exclusions for node_modules and build output.',
              },
              {
                icon: ShieldCheck,
                color: '#ff9f0a',
                title: 'Backup health at a glance',
                body: 'See which projects are protected and which are at risk — before it matters.',
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border border-white/[0.06]"
                  style={{ backgroundColor: `${f.color}14` }}
                >
                  <f.icon className="w-[18px] h-[18px]" style={{ color: f.color }} />
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold tracking-tight mb-1">{f.title}</p>
                  <p className="text-[13px] text-white/40 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
