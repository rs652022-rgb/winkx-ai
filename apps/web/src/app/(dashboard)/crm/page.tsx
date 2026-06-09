'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Users, UserPlus, Search, Filter, Loader2, Phone, Mail, Tag,
  MessageSquare, MoreVertical, Building2, Star, ChevronRight,
  TrendingUp, Target,
} from 'lucide-react';
import { crmApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  CONTACTED: { label: 'Contacted', color: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  QUALIFIED: { label: 'Qualified', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  PROPOSAL: { label: 'Proposal', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  NEGOTIATING: { label: 'Negotiating', color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  WON: { label: 'Won', color: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  LOST: { label: 'Lost', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

export default function CRMPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'contacts' | 'leads' | 'pipeline'>('contacts');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['crm-contacts', search],
    queryFn: () => crmApi.contacts({ search, limit: 50 }) as any,
    enabled: tab === 'contacts',
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => crmApi.leads({ limit: 100 }) as any,
    enabled: tab === 'leads' || tab === 'pipeline',
  });

  const { data: pipelinesData } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: () => crmApi.pipelines() as any,
    enabled: tab === 'pipeline',
  });

  const contacts = contactsData?.contacts || [];
  const leads = leadsData?.leads || [];
  const pipelines = pipelinesData?.pipelines || [];

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: any) => crmApi.updateLead(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-leads'] }),
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }: any) => crmApi.updateDeal(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-pipelines'] }),
  });

  const PIPELINE_STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const STAGE_COLORS: Record<string, string> = {
    LEAD: 'border-blue-500/30',
    QUALIFIED: 'border-violet-500/30',
    PROPOSAL: 'border-amber-500/30',
    NEGOTIATION: 'border-orange-500/30',
    CLOSED_WON: 'border-emerald-500/30',
    CLOSED_LOST: 'border-red-500/30',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage contacts, leads and deals</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-glow"
          >
            <UserPlus className="w-4 h-4" />
            Add {tab === 'contacts' ? 'Contact' : tab === 'leads' ? 'Lead' : 'Deal'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Contacts', value: contactsData?.pagination?.total || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Active Leads', value: leads.filter((l: any) => !['WON', 'LOST'].includes(l.status)).length, icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Qualified', value: leads.filter((l: any) => l.status === 'QUALIFIED').length, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Won', value: leads.filter((l: any) => l.status === 'WON').length, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
            {(['contacts', 'leads', 'pipeline'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {t}
              </button>
            ))}
          </div>
          {tab !== 'pipeline' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="pl-8 pr-4 py-2 text-sm rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-all w-64" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 pt-4">
        {/* CONTACTS TAB */}
        {tab === 'contacts' && (
          contactsLoading ? <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> :
          <div className="card-premium overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  {['Name', 'Phone / Email', 'Channel', 'Tags', 'Conversations', 'Added'].map(h => (
                    <th key={h} className="text-xs font-semibold text-muted-foreground text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No contacts found</td></tr>
                ) : contacts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-all cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(c.firstName || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.firstName} {c.lastName}</p>
                          {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {c.phone && <p className="text-xs text-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                        {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground capitalize">{c.channelType?.toLowerCase() || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{c._count?.conversations || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LEADS TAB */}
        {tab === 'leads' && (
          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="text-center py-20">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No leads yet</p>
              </div>
            ) : leads.map((lead: any, i: number) => (
              <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card-premium p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(lead.firstName || lead.contact?.firstName || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {lead.firstName || lead.contact?.firstName} {lead.lastName || lead.contact?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{lead.company || lead.email || '—'}</p>
                </div>
                {lead.value && <p className="text-sm font-semibold text-foreground">${lead.value.toLocaleString()}</p>}
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_MAP[lead.status]?.color || 'bg-muted text-muted-foreground')}>
                  {STATUS_MAP[lead.status]?.label || lead.status}
                </span>
                <select
                  value={lead.status}
                  onChange={e => updateLeadMutation.mutate({ id: lead.id, data: { status: e.target.value } })}
                  onClick={e => e.stopPropagation()}
                  className="text-xs bg-muted/50 border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none"
                >
                  {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
                </select>
                <p className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(lead.createdAt)}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* PIPELINE (KANBAN) TAB */}
        {tab === 'pipeline' && (
          <div>
            {pipelines.length === 0 ? (
              <div className="text-center py-20">
                <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No pipelines yet</p>
                <button onClick={() => crmApi.createPipeline('Sales Pipeline').then(() => queryClient.invalidateQueries({ queryKey: ['crm-pipelines'] }))} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Create Pipeline</button>
              </div>
            ) : pipelines.map((pipeline: any) => (
              <div key={pipeline.id} className="mb-8">
                <h3 className="font-semibold text-foreground mb-4">{pipeline.name}</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {PIPELINE_STAGES.map(stage => {
                    const stageDeals = (pipeline.deals || []).filter((d: any) => d.stage === stage);
                    const stageValue = stageDeals.reduce((sum: number, d: any) => sum + d.value, 0);
                    return (
                      <div key={stage} className={cn('min-w-[220px] bg-muted/30 rounded-2xl border-2 p-3', STAGE_COLORS[stage])}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-foreground capitalize">{stage.replace('_', ' ')}</p>
                          <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                        </div>
                        {stageValue > 0 && <p className="text-xs text-emerald-400 font-medium mb-2">${stageValue.toLocaleString()}</p>}
                        <div className="space-y-2">
                          {stageDeals.map((deal: any) => (
                            <div key={deal.id} className="bg-card rounded-xl p-3 border border-border hover:border-primary/30 transition-all cursor-pointer shadow-sm">
                              <p className="text-xs font-medium text-foreground truncate">{deal.title}</p>
                              {deal.lead && <p className="text-xs text-muted-foreground truncate">{deal.lead.firstName} {deal.lead.lastName}</p>}
                              {deal.value > 0 && <p className="text-xs text-emerald-400 mt-1 font-medium">${deal.value.toLocaleString()}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
