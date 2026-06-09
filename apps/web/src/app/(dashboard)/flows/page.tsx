'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Search, Filter, Zap, MoreVertical, Play, Pause, Copy, Trash2,
  GitBranch, Clock, ArrowUpRight, Loader2, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { flowsApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function FlowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.list() as any,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => flowsApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flows'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => flowsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Flow duplicated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Flow deleted');
    },
  });

  const flows = (data?.flows || []).filter((f: any) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || f.status.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'status-connected',
    DRAFT: 'bg-muted/50 text-muted-foreground border border-border',
    PAUSED: 'status-pending',
    ARCHIVED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Flows</h1>
          <p className="text-muted-foreground text-sm mt-1">Build and manage your automation workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/flows/new?ai=true')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary/10 border border-primary/20 text-primary font-medium text-sm hover:bg-primary/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            AI Create
          </button>
          <button
            onClick={() => router.push('/flows/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-glow"
          >
            <Plus className="w-4 h-4" />
            New Flow
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Flows', value: data?.flows?.length || 0, icon: GitBranch, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active', value: data?.flows?.filter((f: any) => f.status === 'ACTIVE').length || 0, icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Drafts', value: data?.flows?.filter((f: any) => f.status === 'DRAFT').length || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Total Triggers', value: data?.flows?.reduce((acc: number, f: any) => acc + (f._count?.executions || 0), 0) || 0, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flows..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
          {['all', 'active', 'draft', 'paused'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Flow grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : flows.length === 0 ? (
        <div className="text-center py-20">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No flows yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first automation flow</p>
          <button onClick={() => router.push('/flows/new')} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all">Create Flow</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {flows.map((flow: any, i: number) => (
            <motion.div
              key={flow.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-premium p-5 group hover:shadow-glow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[flow.status])}>
                    {flow.status}
                  </span>
                  <div className="relative">
                    <button className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-1 truncate">{flow.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{flow.description || `${flow.triggerType} trigger`}</p>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>{flow._count?.nodes || 0} nodes</span>
                <span>{formatRelativeTime(flow.updatedAt)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/flows/${flow.id}`)}
                  className="flex-1 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-all flex items-center justify-center gap-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(flow.id); }}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1', flow.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20')}
                >
                  {flow.status === 'ACTIVE' ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Activate</>}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
