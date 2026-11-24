"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { AuthGate } from '@/components/AuthGate';

/** Staff-facing cover links (/cover/...) are public and full-screen; everything else is the signed-in app. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/cover/')) return <>{children}</>;
  return (
    <AuthGate>
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar />
        <MobileNav />
        <main className="flex-1 w-full max-w-7xl mx-auto h-screen overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
