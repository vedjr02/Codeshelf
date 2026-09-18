'use client';

import * as React from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'codeshelf:appearance';

interface ThemeContextValue {
  /** What the user picked. */
  choice: ThemeChoice;
  /** What is actually painted right now. */
  resolved: 'light' | 'dark';
  setChoice: (next: ThemeChoice) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  choice: 'system',
  resolved: 'light',
  setChoice: () => {},
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

/**
 * Runs before first paint so the correct theme is already on <html>.
 * Kept in sync with the provider below — both read the same key.
 */
export const themeBootstrapScript = `(function(){try{var c=localStorage.getItem('${STORAGE_KEY}')||'system';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(choice: ThemeChoice): 'light' | 'dark' {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark());
  const root = document.documentElement;

  // Freeze transitions for one frame so every token flips together.
  root.classList.add('theme-transitioning');
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  window.setTimeout(() => root.classList.remove('theme-transitioning'), 90);

  return dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = React.useState<ThemeChoice>('system');
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('light');

  // Adopt whatever the bootstrap script already put on <html>.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let stored: ThemeChoice = 'system';
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw;
      } catch {
        // Private browsing — fall back to system.
      }
      setChoiceState(stored);
      setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Follow the OS while the choice is "system".
  React.useEffect(() => {
    if (choice !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(apply('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = React.useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not fatal: the theme still applies for this session.
    }
    setChoiceState(next);
    setResolved(apply(next));
  }, []);

  const value = React.useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
