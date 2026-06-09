'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Users, Building2, Activity, TrendingUp, MessageSquare,
  Server, Zap, Search, Filter, Ban, Check, Loader2, Crown,
  AlertTriangle, RefreshCw, BarChart3, Database, Globe,
  ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNumber, formatRelativeTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';

type AdminTab = 'overview' | 'users' | 'orgs' | 'audit';

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);

  // Guard: Super admin only
  if (user && !user.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">Super admin privileges required</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats() as any,
    enabled: tab === 'overview',
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userPage],
    queryFn: () => adminApi.users({ search: userSearch || undefined, page: userPage, limit: 20 }) as any,
    enabled: tab === 'users',
  });

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin-orgs', orgSearch, orgPage],
    queryFn: () => adminApi.orgs({ search: orgSearch || undefined, page: orgPage, limit: 20 }) as any,
    enabled: tab === 'orgs',
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.auditLogs({ limit: 50 }) as any,
    enabled: tab === 'audit',
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = statsData?.stats || {};
  const users = usersData?.users || [];
  const orgs = orgsData?.orgs || [];
  const auditLogs = auditData?.logs || [];

  const STAT_CARDS = [
    { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', change: stats.usersThisMonth },
    { label: 'Organizations', value: stats.totalOrgs || 0, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10', change: stats.orgsThisMonth },
    { label: 'Messages Today', value: stats.messagesToday || 0, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Active Flows', value: stats.activeFlows || 0, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'AI Queries Today', value: stats.aiQueriesToday || 0, icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Revenue MTD', value: stats.revenueMTD || 0, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', currency: true },
  ];

  const PLAN_BADGE: Record<string, string> = {
    STARTER: 'bg-muted/50 text-muted-foreground border border-border',
    PROFESSIONAL: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    BUSINESS: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    ENTERPRISE: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    WHITE_LABEL: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Super Admin Console — WinkX AI</p>
          </div>
        </div>
        <button onClick={() => queryClient.invalidateQueries()} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {(['overview', 'users', 'orgs', 'audit'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'overview' ? '📊 Overview' : t === 'users' ? '👥 Users' : t === 'orgs' ? '🏢 Orgs' : '🔍 Audit'}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAT_CARDS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
                <p className="text-2xl font-bold text-foreground">{stat.currency ? `$${formatNumber(stat.value)}` : formatNumber(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.change !== undefined && (
                  <p className="text-xs text-emerald-400">+{stat.change} this month</p>
                )}
              </motion.div>
            ))}
          </div>

          {/* System status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'API Server', status: 'operational', icon: Server, detail: 'All endpoints healthy' },
              { label: 'Database', status: 'operational', icon: Database, detail: 'PostgreSQL connected' },
              { label: 'Message Queue', status: 'operational', icon: Globe, detail: 'Redis running' },
            ].map((svc) => (
              <div key={svc.label} className="card-premium p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><svc.icon className="w-5 h-5 text-emerald-400" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{svc.label}</p>
                  <p className="text-xs text-muted-foreground">{svc.detail}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </div>
              </div>
            ))}
          </div>

          {/* Top orgs */}
          {stats.topOrgs?.length > 0 && (
            <div className="card-premium p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Organizations by Usage</h3>
              <div className="space-y-3">
                {stats.topOrgs.map((org: any, i: number) => (
                  <div key={org.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all">
                    <span className="w-6 text-xs text-muted-foreground font-mono">#{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">{org.name?.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(org.messageCount)} messages</p>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', PLAN_BADGE[org.plan] || PLAN_BADGE.STARTER)}>{org.plan}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <p className="text-sm text-muted-foreground">{usersData?.total || 0} users</p>
          </div>

          <div className="card-premium overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No users found</td></tr>
                ) : users.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-all">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">{u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</div>
                        <p className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.isSuperAdmin
                        ? <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full flex items-center gap-1 w-fit"><Crown className="w-3 h-3" />Super Admin</span>
                        : <span className="text-xs bg-muted/50 text-muted-foreground border border-border px-2 py-1 rounded-full">{u.orgMemberships?.[0]?.role || 'Member'}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', u.isActive ? 'status-connected' : 'status-disconnected')}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateUserMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                          className={cn('p-1.5 rounded-lg transition-all text-xs', u.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10')}
                          title={u.isActive ? 'Suspend' : 'Activate'}
                        >
                          {u.isActive ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {userPage} of {usersData.totalPages}</span>
              <button onClick={() => setUserPage(p => Math.min(usersData.totalPages, p + 1))} disabled={userPage === usersData.totalPages} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ORGS */}
      {tab === 'orgs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={orgSearch} onChange={e => { setOrgSearch(e.target.value); setOrgPage(1); }} placeholder="Search organizations..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <p className="text-sm text-muted-foreground">{orgsData?.total || 0} organizations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgsLoading ? (
              <div className="col-span-3 flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : orgs.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">No organizations found</div>
            ) : orgs.map((org: any, i: number) => (
              <motion.div key={org.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card-premium p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">{org.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0', PLAN_BADGE[org.plan] || PLAN_BADGE.STARTER)}>{org.plan}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Members', value: org._count?.members || 0 },
                    { label: 'Channels', value: org._count?.channels || 0 },
                    { label: 'Contacts', value: org._count?.contacts || 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/30 rounded-lg p-2">
                      <p className="text-sm font-bold text-foreground">{formatNumber(s.value)}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>Created {formatRelativeTime(org.createdAt)}</span>
                  <span className={cn('flex items-center gap-1', org.isActive ? 'text-emerald-400' : 'text-red-400')}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', org.isActive ? 'bg-emerald-400' : 'bg-red-400')} />
                    {org.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOGS */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground">Recent Activity Log</h3>
              <p className="text-xs text-muted-foreground mt-1">Last 50 admin events across all organizations</p>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No audit logs yet</div>
            ) : (
              <div className="divide-y divide-border/50">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-4 hover:bg-muted/20 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">{log.action}</span>
                        <span className="text-xs text-muted-foreground">{log.resource}</span>
                        {log.resourceId && <span className="text-xs font-mono text-muted-foreground/70 truncate">{log.resourceId.slice(0, 8)}…</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{log.org?.name || 'System'}</span>
                        {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                        <span>{formatRelativeTime(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
