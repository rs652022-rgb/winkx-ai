'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Megaphone, Play, Pause, Trash2, BarChart3,
  Calendar, Users, Zap, Loader2, CheckCircle2, Clock, XCircle,
  Send, Eye, MousePointerClick, MessageSquare, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { campaignsApi } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  DRAFT: { label: 'Draft', icon: Clock, color: 'bg-muted/50 text-muted-foreground border border-border' },
  SCHEDULED: { label: 'Scheduled', icon: Calendar, color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  RUNNING: { label: 'Running', icon: Play, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  PAUSED: { label: 'Paused', icon: Pause, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
};

const CHANNEL_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  WHATSAPP: { label: 'WhatsApp', emoji: '💬', color: '#25D366' },
  INSTAGRAM: { label: 'Instagram', emoji: '📸', color: '#E1306C' },
  FACEBOOK: { label: 'Facebook', emoji: '👍', color: '#1877F2' },
  ALL: { label: 'All Channels', emoji: '📡', color: '#6366f1' },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: () => campaignsApi.list({ status: statusFilter !== 'all' ? statusFilter : undefined, limit: 50 }) as any,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['campaign-analytics', selectedCampaign?.id],
    queryFn: () => campaignsApi.analytics(selectedCampaign!.id) as any,
    enabled: !!selectedCampaign?.id,
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.launch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign launched!');
    },
    onError: (e: any) => toast.error(e.message || 'Launch failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
      if (selectedCampaign) setSelectedCampaign(null);
    },
  });

  const campaigns = (data?.campaigns || []).filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStats = campaigns.reduce((acc: any, c: any) => ({
    sent: acc.sent + (c.analytics?.sent || 0),
    delivered: acc.delivered + (c.analytics?.delivered || 0),
    read: acc.read + (c.analytics?.read || 0),
  }), { sent: 0, delivered: 0, read: 0 });

  const chartData = analyticsData?.analytics?.slice(-14).map((a: any) => ({
    date: new Date(a.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    sent: a.sent, delivered: a.delivered, read: a.read, clicked: a.clicked,
  })) || [];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel — campaign list */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Campaigns</h2>
            <button onClick={() => setShowCreateModal(true)} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {['all', 'DRAFT', 'RUNNING', 'SCHEDULED', 'COMPLETED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all', statusFilter === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <Megaphone className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No campaigns</p>
            </div>
          ) : campaigns.map((campaign: any) => {
            const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
            const channelCfg = CHANNEL_CONFIG[campaign.channel] || CHANNEL_CONFIG.ALL;
            return (
              <button key={campaign.id} onClick={() => setSelectedCampaign(campaign)} className={cn('w-full text-left p-4 hover:bg-muted/50 transition-all border-b border-border/50', selectedCampaign?.id === campaign.id && 'bg-muted/70')}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: channelCfg.color + '20' }}>
                    {channelCfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full', statusCfg.color)}>{statusCfg.label}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(campaign.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — campaign detail */}
      {selectedCampaign ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            {/* Campaign header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedCampaign.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">{CHANNEL_CONFIG[selectedCampaign.channel]?.label} · {selectedCampaign.type}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCampaign.status === 'DRAFT' && (
                  <button onClick={() => launchMutation.mutate(selectedCampaign.id)} disabled={launchMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50">
                    {launchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" />Launch</>}
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(selectedCampaign.id)} className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Analytics cards */}
            {analyticsData?.totals && (
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Sent', value: analyticsData.totals.sent, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Delivered', value: analyticsData.totals.delivered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Read', value: analyticsData.totals.read, icon: Eye, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'Clicked', value: analyticsData.totals.clicked, icon: MousePointerClick, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map(stat => (
                  <div key={stat.label} className="metric-card">
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(stat.value)}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Analytics chart */}
            {chartData.length > 0 && (
              <div className="card-premium p-6">
                <h3 className="font-semibold text-foreground mb-6">Performance Over Time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="sent" fill="#6366f1" radius={4} />
                    <Bar dataKey="delivered" fill="#10b981" radius={4} />
                    <Bar dataKey="read" fill="#8b5cf6" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* No analytics yet */}
            {!analyticsData?.totals && (
              <div className="card-premium p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">No analytics yet</p>
                <p className="text-muted-foreground text-sm">Launch the campaign to see performance data</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a campaign</h3>
            <p className="text-muted-foreground text-sm">View analytics and manage campaigns</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-6 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all">
              Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && <CreateCampaignModal onClose={() => setShowCreateModal(false)} onCreated={(c: any) => { setSelectedCampaign(c); setShowCreateModal(false); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); }} />}
    </div>
  );
}

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [form, setForm] = useState({ name: '', type: 'BROADCAST', channel: 'WHATSAPP', content: { message: '' } });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Campaign name required');
    setIsLoading(true);
    try {
      const result = await campaignsApi.create(form) as any;
      onCreated(result.campaign);
      toast.success('Campaign created!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create campaign');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Create Campaign</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Campaign Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale Blast" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                <option value="BROADCAST">Broadcast</option>
                <option value="SEQUENCE">Sequence</option>
                <option value="DRIP">Drip</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Channel</label>
              <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="ALL">All Channels</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Message</label>
            <textarea value={form.content.message} onChange={e => setForm({ ...form, content: { ...form.content, message: e.target.value } })} placeholder="Hi {{name}}, check out our latest offer..." rows={4} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Create Campaign
          </button>
        </div>
      </motion.div>
    </div>
  );
}
