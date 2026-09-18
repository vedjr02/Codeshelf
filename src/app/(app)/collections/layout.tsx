import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Hand-made collections and Smart Collections built from rules.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
