'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Settings, Trash2, RefreshCw, Loader2, Check,
  AlertCircle, Wifi, WifiOff, QrCode, ExternalLink, X,
} from 'lucide-react';
import { channelsApi } from '@/lib/api';
import { formatRelativeTime, CHANNEL_COLORS, cn } from '@/lib/utils';

const CHANNEL_DEFS = [
  {
    type: 'WHATSAPP', name: 'WhatsApp Business', color: '#25D366', emoji: '💬',
    desc: 'Connect via WhatsApp Business API (Cloud API)',
    fields: ['phoneNumberId', 'accessToken', 'wabaId'],
    fieldLabels: { phoneNumberId: 'Phone Number ID', accessToken: 'Access Token', wabaId: 'WABA ID' },
  },
  {
    type: 'INSTAGRAM', name: 'Instagram DMs', color: '#E1306C', emoji: '📸',
    desc: 'Connect via Instagram Graph API for DMs',
    fields: ['pageId', 'accessToken'],
    fieldLabels: { pageId: 'Page ID', accessToken: 'Access Token' },
  },
  {
    type: 'FACEBOOK', name: 'Facebook Pages', color: '#1877F2', emoji: '👍',
    desc: 'Connect via Facebook Messenger API',
    fields: ['pageId', 'accessToken', 'appSecret'],
    fieldLabels: { pageId: 'Page ID', accessToken: 'Page Access Token', appSecret: 'App Secret' },
  },
];

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const [connectModal, setConnectModal] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsApi.list() as any,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => channelsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel disconnected');
      setSelectedChannel(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => channelsApi.sync(id),
    onSuccess: () => toast.success('Channel synced'),
    onError: () => toast.error('Sync failed'),
  });

  const channels = data?.channels || [];
  const connectedChannels = channels.filter((c: any) => c.status === 'CONNECTED');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channels</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect and manage your messaging channels</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">{connectedChannels.length} active</span>
        </div>
      </div>

      {/* Add new channel */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Connect a Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHANNEL_DEFS.map((def, i) => (
            <motion.button key={def.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => setConnectModal(def)} className="card-premium p-6 text-left hover:border-primary/30 hover:shadow-glow group transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: def.color + '20' }}>
                  {def.emoji}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{def.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400">Available</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{def.desc}</p>
              <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                <Plus className="w-4 h-4" />Connect
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Connected channels */}
      {channels.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Connected Channels</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel: any) => {
                const def = CHANNEL_DEFS.find(d => d.type === channel.type);
                return (
                  <motion.div key={channel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-4 flex items-center gap-4 hover:border-primary/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: (CHANNEL_COLORS[channel.type] || '#6366f1') + '20' }}>
                      {def?.emoji || '📡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{def?.name} · {channel._count?.conversations || 0} conversations</p>
                    </div>

                    <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium', channel.status === 'CONNECTED' ? 'status-connected' : 'status-disconnected')}>
                      {channel.status === 'CONNECTED' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {channel.status}
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => syncMutation.mutate(channel.id)} disabled={syncMutation.isPending} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground" title="Sync">
                        <RefreshCw className={cn('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
                      </button>
                      <button onClick={() => disconnectMutation.mutate(channel.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive" title="Disconnect">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && !isLoading && (
        <div className="text-center py-20 card-premium">
          <WifiOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No channels connected</h3>
          <p className="text-muted-foreground text-sm">Connect your first messaging channel to start automating</p>
        </div>
      )}

      {/* Connect Modal */}
      {connectModal && <ConnectModal def={connectModal} onClose={() => setConnectModal(null)} onConnected={() => { setConnectModal(null); queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success(`${connectModal.name} connected!`); }} />}
    </div>
  );
}

function ConnectModal({ def, onClose, onConnected }: any) {
  const [name, setName] = useState('');
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!name.trim()) return toast.error('Channel name required');
    const missingField = def.fields.find((f: string) => !creds[f]?.trim());
    if (missingField) return toast.error(`${def.fieldLabels[missingField]} is required`);
    setIsLoading(true);
    try {
      await channelsApi.connect({ type: def.type, name, credentials: creds });
      onConnected();
    } catch (e: any) {
      toast.error(e.message || 'Connection failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{def.emoji}</span>
            <h2 className="text-lg font-bold text-foreground">Connect {def.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            💡 You'll need to set up a {def.name} app on Meta Developers portal first.{' '}
            <a href="https://developers.facebook.com" target="_blank" className="underline">Open Meta Developers →</a>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Channel Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={`My ${def.name} Channel`} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          {def.fields.map((field: string) => (
            <div key={field}>
              <label className="block text-xs font-medium text-foreground mb-2">{def.fieldLabels[field]} *</label>
              <input
                value={creds[field] || ''}
                onChange={e => setCreds({ ...creds, [field]: e.target.value })}
                type={field.toLowerCase().includes('token') || field.toLowerCase().includes('secret') ? 'password' : 'text'}
                placeholder={`Enter ${def.fieldLabels[field]}`}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all font-mono"
              />
            </div>
          ))}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm">Cancel</button>
          <button onClick={handleConnect} disabled={isLoading} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: def.color }}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Connect
          </button>
        </div>
      </motion.div>
    </div>
  );
}
