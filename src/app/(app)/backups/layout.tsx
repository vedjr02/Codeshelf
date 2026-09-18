import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Backups',
  description: 'Local snapshots of your projects, and what you can restore.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
