import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Project',
  description: 'One project: its score, git state, storage and snapshots.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
