'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, GitBranch, Users, Megaphone,
  BarChart3, Bot, CreditCard, Settings, Code, Shield,
  Zap, ChevronLeft, ChevronRight, Plus, Store, Wifi, CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inbox', icon: MessageSquare, label: 'Inbox', badge: 'Live' },
  { href: '/channels', icon: Wifi, label: 'Channels' },
  { href: '/flows', icon: GitBranch, label: 'Flows' },
  { href: '/crm', icon: Users, label: 'CRM' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/ai-agents', icon: Bot, label: 'AI Agents' },
  { href: '/appointments', icon: CalendarDays, label: 'Appointments' },
  { href: '/templates', icon: Store, label: 'Templates' },
];

const bottomNavItems = [
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/developer', icon: Code, label: 'Developer' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, org } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-sidebar-foreground font-bold text-base whitespace-nowrap"
            >
              WinkX AI
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Org selector */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-3"
          >
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">{org?.name?.charAt(0) || 'W'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sidebar-foreground text-sm font-medium truncate">{org?.name || 'My Workspace'}</p>
                <p className="text-sidebar-foreground/40 text-xs capitalize">{org?.plan?.toLowerCase() || 'Starter'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick create */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <Link
            href="/flows/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Flow
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-item',
                isActive && 'active'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        {user?.isSuperAdmin && (
          <Link
            href="/admin"
            className={cn('sidebar-item', pathname.startsWith('/admin') && 'active')}
            title={collapsed ? 'Admin' : undefined}
          >
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Admin</motion.span>}
          </Link>
        )}
        {bottomNavItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-item', isActive && 'active')}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-lg hover:bg-sidebar-accent transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-xs font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sidebar-foreground/40 text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
