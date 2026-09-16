import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'CodeShelf',
  description: 'Your personal developer project library & local backup manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="relative">
        {/* Ambient background — subtle radial glows, much softer than before */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[32rem]"
            style={{ background: 'radial-gradient(60% 50% at 50% -5%, rgba(41,151,255,0.10), transparent 70%)' }} />
          <div className="absolute -bottom-64 -left-40 h-[28rem] w-[28rem] rounded-full bg-[#2997ff]/[0.04] blur-[120px]" />
          <div className="absolute -top-40 -right-40 h-[26rem] w-[26rem] rounded-full bg-white/[0.03] blur-[110px]" />
        </div>

        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
