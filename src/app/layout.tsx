import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider, themeBootstrapScript } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: {
    default: 'CodeShelf',
    template: '%s — CodeShelf',
  },
  description: 'Your personal developer project library and local backup manager.',
  applicationName: 'CodeShelf',
  // A private index of one machine's folders. Nothing here is for the web.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The proxy mints a per-request nonce; the CSP admits no other inline script.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored appearance before first paint, so the page
            never flashes the wrong theme. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
