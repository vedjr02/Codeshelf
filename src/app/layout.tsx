import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeShelf',
  description: 'Your personal developer project library & cloud backup',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="relative">
        {/* Ambient background orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-violet-600/10 blur-[120px] animate-float" />
          <div className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/[0.08] blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute -bottom-48 left-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-600/[0.07] blur-[120px] animate-float" style={{ animationDelay: '-5s' }} />
        </div>

        <main className="pl-64 relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}