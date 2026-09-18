import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Import',
  description: 'Scan a folder and import the projects found inside it.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
