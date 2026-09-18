'use client';

import * as React from 'react';
import { Sidebar, SidebarFallback } from '@/components/sidebar';
import { CommandPalette } from '@/components/command-palette';
import { LibraryProvider } from '@/components/library-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toast';

interface ShellValue {
  openNav: () => void;
}

const ShellContext = React.createContext<ShellValue>({ openNav: () => {} });

/** Lets a page put the navigation button in its own toolbar on small screens. */
export function useShell() {
  return React.useContext(ShellContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = React.useState(false);
  const { success } = useToast();

  const openNav = React.useCallback(() => setNavOpen(true), []);
  const closeNav = React.useCallback(() => setNavOpen(false), []);

  React.useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the drawer from scrolling with it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      success('Signed out', 'See you soon.');
    } finally {
      // A hard navigation is deliberate: it drops every cached authenticated
      // page and all client state along with the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login');
    }
  }, [success]);

  const shellValue = React.useMemo<ShellValue>(() => ({ openNav }), [openNav]);

  return (
    <LibraryProvider>
      <TooltipProvider delayDuration={400}>
        <ShellContext.Provider value={shellValue}>
          <CommandPalette />

          <div className="flex min-h-screen">
            {/* Desktop navigation stays on screen; it is the app's spine. */}
            <div className="sticky top-0 hidden h-screen shrink-0 md:block">
              {/* The sidebar highlights the active collection from the query
                  string, so it renders inside a boundary. */}
              <React.Suspense fallback={<SidebarFallback />}>
                <Sidebar onLogout={handleLogout} />
              </React.Suspense>
            </div>

            {/* Mobile drawer */}
            {navOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={closeNav}
                  className="absolute inset-0 animate-fade bg-scrim backdrop-blur-[2px]"
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation"
                  className="absolute left-0 top-0 h-full animate-slide-from-left shadow-[var(--shadow-pop)]"
                >
                  <React.Suspense fallback={<SidebarFallback />}>
                    <Sidebar onLogout={handleLogout} onNavigate={closeNav} />
                  </React.Suspense>
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </ShellContext.Provider>
      </TooltipProvider>
    </LibraryProvider>
  );
}
