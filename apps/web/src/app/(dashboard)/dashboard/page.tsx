'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare, Users, Zap, TrendingUp, ArrowUpRight, ArrowDownRight,
  MessageCircle, Bot, Target, DollarSign, Calendar, Activity,
  PlayCircle, Wifi, WifiOff, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { analyticsApi, channelsApi, inboxApi } from '@/lib/api';
import { formatNumber, formatCurrency, formatRelativeTime, CHANNEL_COLORS } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

const metricCards = [
  { key: 'totalContacts', label: 'Total Contacts', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'openConversations', label: 'Open Conversations', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'newLeads', label: 'New Leads', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', currency: true },
  { key: 'messagesSent', label: 'Messages Sent', icon: MessageCircle, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'activeCampaigns', label: 'Active Campaigns', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'activeFlows', label: 'Active Flows', icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { key: 'completedAppointments', label: 'Appointments', icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

export default function DashboardPage() {
  const { user, org } = useAuthStore();

  const { data: analyticsData, isLoading: analyticsLoading, refetch } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsApi.dashboard() as any,
    refetchInterval: 30000,
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsApi.list() as any,
  });

  const { data: inboxStats } = useQuery({
    queryKey: ['inbox-stats'],
    queryFn: () => inboxApi.stats() as any,
    refetchInterval: 15000,
  });

  const overview = analyticsData?.overview || {};
  const channels = channelsData?.channels || [];
  const connectedChannels = channels.filter((c: any) => c.status === 'CONNECTED');

  const chartData = analyticsData?.charts?.messageVolume || Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    sent: Math.floor(Math.random() * 500),
    received: Math.floor(Math.random() * 300),
  }));

  const pieData = analyticsData?.charts?.channelBreakdown?.map((c: any) => ({
    name: c.channelType,
    value: c.conversations,
    color: CHANNEL_COLORS[c.channelType] || '#6366f1',
  })) || [
    { name: 'WhatsApp', value: 45, color: '#25D366' },
    { name: 'Instagram', value: 35, color: '#E1306C' },
    { name: 'Facebook', value: 20, color: '#1877F2' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Good morning, {user?.firstName} 👋
          </motion.h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with {org?.name} today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">
              {connectedChannels.length} channel{connectedChannels.length !== 1 ? 's' : ''} connected
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {metricCards.map((card, i) => {
          const value = overview[card.key] || 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="col-span-1 xl:col-span-2 metric-card group hover:border-primary/30 hover:shadow-glow cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {card.currency ? formatCurrency(value) : formatNumber(value)}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Volume */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 card-premium p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Message Volume</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" />Sent</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500" />Received</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="url(#sentGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="received" stroke="#8b5cf6" fill="url(#recvGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Channel Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-premium p-6"
        >
          <h3 className="font-semibold text-foreground mb-1">Channel Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-6">Conversations by channel</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                {pieData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Connected Channels + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-premium p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Connected Channels</h3>
            <a href="/channels" className="text-xs text-primary hover:text-primary/80 transition-colors">Manage →</a>
          </div>
          <div className="space-y-3">
            {channels.length === 0 ? (
              <div className="text-center py-8">
                <WifiOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No channels connected yet</p>
                <a href="/channels" className="text-xs text-primary hover:underline mt-1 block">Connect a channel →</a>
              </div>
            ) : (
              channels.slice(0, 5).map((channel: any) => (
                <div key={channel.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: `${CHANNEL_COLORS[channel.type]}20` }}>
                    {channel.type === 'WHATSAPP' ? '💬' : channel.type === 'INSTAGRAM' ? '📸' : '👍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">{channel._count?.conversations || 0} conversations</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                    channel.status === 'CONNECTED' ? 'status-connected' : 'status-disconnected'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    {channel.status === 'CONNECTED' ? 'Active' : 'Offline'}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card-premium p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Flow', icon: '⚡', href: '/flows/new', desc: 'Build automation', color: 'from-primary-500/20 to-violet-500/20' },
              { label: 'Broadcast', icon: '📢', href: '/campaigns/new', desc: 'Send campaign', color: 'from-pink-500/20 to-rose-500/20' },
              { label: 'Add Contact', icon: '👤', href: '/crm/contacts/new', desc: 'CRM entry', color: 'from-emerald-500/20 to-cyan-500/20' },
              { label: 'AI Generator', icon: '🤖', href: '/flows/new?ai=true', desc: 'Generate with AI', color: 'from-amber-500/20 to-orange-500/20' },
              { label: 'View Inbox', icon: '💌', href: '/inbox', desc: 'All messages', color: 'from-blue-500/20 to-cyan-500/20' },
              { label: 'Analytics', icon: '📊', href: '/analytics', desc: 'View reports', color: 'from-purple-500/20 to-violet-500/20' },
            ].map(action => (
              <a
                key={action.label}
                href={action.href}
                className={`flex flex-col gap-2 p-4 rounded-xl bg-gradient-to-br ${action.color} border border-white/5 hover:border-white/10 hover:scale-[1.02] transition-all cursor-pointer`}
              >
                <span className="text-2xl">{action.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
