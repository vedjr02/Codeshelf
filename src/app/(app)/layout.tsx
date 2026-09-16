import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

/**
 * Route group layout: everything under (app) is rendered inside the
 * auth-aware AppShell (sidebar, mobile drawer, command palette).
 * /login sits outside this group so it renders chrome-free.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
