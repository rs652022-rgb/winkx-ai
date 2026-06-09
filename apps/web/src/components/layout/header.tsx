'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, LogOut, User, HelpCircle, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

export function Header() {
  const { user, org, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState(3);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations, flows, contacts..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted/50 border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Help */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all relative">
          <Bell className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full">
              {notifications}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            id="header-user-menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground leading-none">{user?.firstName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{org?.name}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg p-1 z-50">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              {[
                { icon: User, label: 'Profile', href: '/settings/profile' },
                { icon: HelpCircle, label: 'Help & Support', href: 'https://docs.winkx.ai' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setShowUserMenu(false); router.push(item.href); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-all"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
