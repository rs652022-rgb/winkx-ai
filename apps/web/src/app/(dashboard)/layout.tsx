'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('winkx_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!user) {
      loadUser();
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      const token = localStorage.getItem('winkx_token');
      if (!token) router.replace('/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading WinkX AI...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
