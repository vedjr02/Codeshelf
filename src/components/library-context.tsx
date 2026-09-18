'use client';

import * as React from 'react';
import type { SessionUser } from '@/lib/session';
import type { SmartRules } from '@/lib/smart-rules';
import type { HealthGrade } from '@/lib/health';

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  projectCount: number;
}

export interface TagSummary {
  id: string;
  name: string;
  color: string;
  projectCount: number;
}

export interface SmartCollectionSummary {
  id: string;
  name: string;
  icon?: string | null;
  rules: SmartRules;
  description: string;
  projectCount: number;
  sample: Array<{ id: string; name: string }>;
}

interface LibraryValue {
  user: SessionUser | null;
  authResolved: boolean;
  collections: CollectionSummary[];
  tags: TagSummary[];
  smartCollections: SmartCollectionSummary[];
  /** Library-wide Shelf Score, or null until the dashboard has answered. */
  libraryScore: number | null;
  libraryGrade: HealthGrade | null;
  totalProjects: number;
  /** Re-reads everything the sidebar and pages share. */
  refresh: () => Promise<void>;
}

const LibraryContext = React.createContext<LibraryValue>({
  user: null,
  authResolved: false,
  collections: [],
  tags: [],
  smartCollections: [],
  libraryScore: null,
  libraryGrade: null,
  totalProjects: 0,
  refresh: async () => {},
});

export function useLibrary() {
  return React.useContext(LibraryContext);
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * One fetch of the things every screen needs — who you are, and the shape of
 * your library. Without this the sidebar, dashboard and projects page each
 * re-requested collections on every navigation.
 */
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<LibraryValue, 'refresh'>>({
    user: null,
    authResolved: false,
    collections: [],
    tags: [],
    smartCollections: [],
    libraryScore: null,
    libraryGrade: null,
    totalProjects: 0,
  });

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    const [me, collections, tags, smartCollections, dashboard] = await Promise.all([
      getJson<{ user: SessionUser | null }>('/api/auth/me', { user: null }),
      getJson<CollectionSummary[]>('/api/collections', []),
      getJson<TagSummary[]>('/api/tags', []),
      getJson<SmartCollectionSummary[]>('/api/smart-collections', []),
      getJson<{ libraryScore: number; libraryGrade: HealthGrade; totalProjects: number } | null>(
        '/api/dashboard',
        null
      ),
    ]);

    if (signal?.cancelled) return;

    setState({
      user: me?.user ?? null,
      authResolved: true,
      collections: Array.isArray(collections) ? collections : [],
      tags: Array.isArray(tags) ? tags : [],
      smartCollections: Array.isArray(smartCollections) ? smartCollections : [],
      libraryScore: dashboard?.libraryScore ?? null,
      libraryGrade: dashboard?.libraryGrade ?? null,
      totalProjects: dashboard?.totalProjects ?? 0,
    });
  }, []);

  React.useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      await load(signal);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  // Any page that changes the library dispatches this instead of importing
  // the context just to refresh it.
  React.useEffect(() => {
    const onChanged = () => {
      void load();
    };
    window.addEventListener('codeshelf:library-changed', onChanged);
    return () => window.removeEventListener('codeshelf:library-changed', onChanged);
  }, [load]);

  const value = React.useMemo<LibraryValue>(
    () => ({ ...state, refresh: () => load() }),
    [state, load]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

/** Tells the shell that collections, tags or projects changed. */
export function notifyLibraryChanged() {
  window.dispatchEvent(new Event('codeshelf:library-changed'));
}
