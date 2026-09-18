'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Library, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/tabs';
import { AppearanceToggle } from '@/components/appearance-toggle';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>('login');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  // null while unknown, so the form does not flash a tab it is about to hide.
  const [canRegister, setCanRegister] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let live = true;
    fetch('/api/auth/register')
      .then((res) => res.json())
      .then((payload) => {
        if (!live) return;
        const open = Boolean(payload?.open);
        setCanRegister(open);
        // A shelf with no account yet starts on the form that creates one.
        if (open) setMode('register');
      })
      .catch(() => live && setCanRegister(false));
    return () => {
      live = false;
    };
  }, []);

  const isRegister = mode === 'register';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (isRegister && password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload.error || 'That did not work. Please try again.');
        setSubmitting(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Is it running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-14">
        <div className="animate-rise">
          <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-accent">
            <Library className="h-[21px] w-[21px] text-on-accent" />
          </span>

          <h1 className="mt-7 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">
            {isRegister ? 'Create your shelf' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-3">
            {isRegister
              ? 'One account for every project on this machine. Nothing leaves it.'
              : 'Sign in to your project library.'}
          </p>

          {canRegister && (
            <div className="mt-7">
              <Segmented
                aria-label="Sign in or create an account"
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  setError(null);
                }}
                options={[
                  { value: 'login', label: 'Sign in' },
                  { value: 'register', label: 'Create account' },
                ]}
                className="w-full"
              />
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isRegister && (
              <Field label="Name" htmlFor="name" className="animate-fade">
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11"
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegister ? 8 : undefined}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {isRegister && (
              <Field label="Confirm password" htmlFor="confirm" className="animate-fade">
                <Input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-11"
                />
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-[var(--radius-md)] bg-bad-tint px-3.5 py-2.5 text-[14px] text-bad">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-7 text-[13.5px] leading-relaxed text-ink-4">
            CodeShelf runs locally. Your library, notes and archives stay on this machine — there is no server to
            send them to.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[420px] px-6 pb-8">
        <div className="flex items-center justify-between gap-4 border-t-[0.5px] border-line pt-5">
          <span className="text-[13.5px] text-ink-4">Appearance</span>
          <div className="w-[150px]">
            <AppearanceToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
