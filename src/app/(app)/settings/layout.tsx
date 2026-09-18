import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Appearance, backup location and library preferences.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
