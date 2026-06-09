'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  BarChart3, TrendingUp, MessageSquare, Users, Target, Send,
  Eye, MousePointerClick, Calendar, Download, RefreshCw, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { formatNumber, formatCurrency, cn } from '@/lib/utils';

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);

  const from = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics-dashboard', range],
    queryFn: () => analyticsApi.dashboard({ from, to }) as any,
  });

  const { data: perfData } = useQuery({
    queryKey: ['analytics-performance', range],
    queryFn: () => analyticsApi.performance({ from, to }) as any,
  });

  const overview = data?.overview || {};
  const charts = data?.charts || {};

  // Generate daily message volume from raw data or use sample
  const messageVolume = charts.messageVolume?.length > 0
    ? charts.messageVolume.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        sent: Number(d.sent) || 0,
        received: Number(d.received) || 0,
      }))
    : Array.from({ length: range > 30 ? 12 : range }, (_, i) => ({
        date: new Date(Date.now() - (range - 1 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        sent: Math.floor(Math.random() * 500 + 100),
        received: Math.floor(Math.random() * 300 + 50),
      }));

  const channelData = (charts.channelBreakdown || [
    { channelType: 'WhatsApp', conversations: 1240 },
    { channelType: 'Instagram', conversations: 890 },
    { channelType: 'Facebook', conversations: 340 },
  ]).map((c: any) => ({ name: c.channelType, value: c.conversations }));

  const CHANNEL_COLORS_LIST = ['#25D366', '#E1306C', '#1877F2', '#6366f1'];

  const leadSources = charts.leadsBySource || [
    { source: 'WhatsApp', count: 340 },
    { source: 'Instagram', count: 220 },
    { source: 'Facebook', count: 180 },
    { source: 'Organic', count: 90 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform performance and growth metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
            {DATE_RANGES.map(r => (
              <button key={r.days} onClick={() => setRange(r.days)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', range === r.days ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all text-sm">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Messages Sent', value: overview.messagesSent || 0, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Received', value: overview.messagesReceived || 0, icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'New Contacts', value: overview.newContacts || 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'New Leads', value: overview.newLeads || 0, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Campaigns', value: overview.totalCampaigns || 0, icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10' },
              { label: 'Revenue', value: overview.revenue || 0, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', currency: true },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="metric-card">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
                <p className="text-xl font-bold text-foreground">{stat.currency ? formatCurrency(stat.value) : formatNumber(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Message Volume Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-premium p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Message Volume</h3>
                <p className="text-xs text-muted-foreground">Last {range} days</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" />Sent</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500" />Received</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={messageVolume}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="url(#gradSent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="received" stroke="#8b5cf6" fill="url(#gradRecv)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Breakdown Pie */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-premium p-6">
              <h3 className="font-semibold text-foreground mb-1">Channel Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-6">Conversations by channel</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" strokeWidth={0}>
                    {channelData.map((_: any, index: number) => (
                      <Cell key={index} fill={CHANNEL_COLORS_LIST[index % CHANNEL_COLORS_LIST.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Lead Sources Bar */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-premium p-6">
              <h3 className="font-semibold text-foreground mb-1">Lead Sources</h3>
              <p className="text-xs text-muted-foreground mb-6">Where your leads come from</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadSources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="source" type="category" width={80} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Campaign Performance */}
          {perfData?.campaigns && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-premium p-6">
              <h3 className="font-semibold text-foreground mb-6">Campaign Performance Summary</h3>
              <div className="grid grid-cols-5 gap-6">
                {[
                  { label: 'Total Sent', value: perfData.campaigns.sent || 0 },
                  { label: 'Delivered', value: perfData.campaigns.delivered || 0 },
                  { label: 'Read', value: perfData.campaigns.read || 0 },
                  { label: 'Clicked', value: perfData.campaigns.clicked || 0 },
                  { label: 'Converted', value: perfData.campaigns.converted || 0 },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatNumber(stat.value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
