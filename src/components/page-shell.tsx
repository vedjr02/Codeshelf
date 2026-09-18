'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShell } from '@/components/app-shell';
import { openPalette } from '@/components/command-palette';

interface PageShellProps {
  /** Large title, which also becomes the compact toolbar title on scroll. */
  title: string;
  subtitle?: React.ReactNode;
  /** Small label above the title, used sparingly. */
  eyebrow?: React.ReactNode;
  /** Primary actions, shown beside the title and again in the toolbar. */
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  width?: 'default' | 'wide' | 'narrow';
  children: React.ReactNode;
}

/**
 * Content fills the window and only stops growing at 1600px, so a wide
 * display shows more of the library instead of two empty gutters. `narrow`
 * is the exception: forms and prose still read better on a short measure.
 */
const WIDTHS = {
  narrow: 'max-w-[860px]',
  default: 'max-w-[1600px]',
  wide: 'max-w-[1600px]',
};

/**
 * The page frame every screen shares.
 *
 * A large title in the content, and a translucent toolbar that keeps the
 * title and the page's actions reachable once you scroll past it — the same
 * collapse a Mac window does, so the actions never scroll out of reach on a
 * long list.
 */
export function PageShell({
  title,
  subtitle,
  eyebrow,
  actions,
  back,
  width = 'default',
  children,
}: PageShellProps) {
  const { openNav } = useShell();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 56);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <header
        className={cn(
          'sticky top-0 z-30 flex h-[52px] items-center gap-2 px-4 sm:px-8 xl:px-10',
          'border-b-[0.5px] transition-colors duration-300',
          collapsed ? 'material border-line' : 'border-transparent bg-transparent'
        )}
      >
        <button
          type="button"
          onClick={openNav}
          aria-label="Open navigation"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink md:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        {back && (
          <Link
            href={back.href}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] pl-1 pr-2 text-[14.5px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{back.label}</span>
          </Link>
        )}

        {collapsed && (
          <span className="animate-fade min-w-0 truncate text-[16px] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => openPalette()}
            aria-label="Search"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink md:hidden"
          >
            <Search className="h-[17px] w-[17px]" />
          </button>
          {/* Actions ride along in the toolbar once the header scrolls away.
              Rendered only while collapsed: a hidden-but-focusable copy would
              put every page action into the tab order twice. */}
          {collapsed && actions && (
            <div className="animate-fade hidden items-center gap-2 sm:flex">{actions}</div>
          )}
        </div>
      </header>

      <div className={cn('mx-auto w-full px-5 pb-24 sm:px-8 xl:px-10', WIDTHS[width])}>
        <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:pt-8">
          <div className="min-w-0 animate-rise">
            {eyebrow && (
              <div className="mb-2 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-4">{eyebrow}</div>
            )}
            <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[40px]">
              {title}
            </h1>
            {subtitle && <p className="mt-2 max-w-[62ch] text-[16px] leading-relaxed text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </div>
  );
}

/** A section inside a page: quiet heading, optional action, then content. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3.5', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            )}
            {description && <p className="mt-1 text-[14.5px] text-ink-3">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
