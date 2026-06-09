'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, Check, Webhook, Link2,
  Loader2, Globe, ShieldCheck, Terminal, Code, RefreshCw, ExternalLink,
} from 'lucide-react';
import { developerApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function DeveloperPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => developerApi.listKeys() as any,
    enabled: tab === 'keys',
  });

  const { data: webhooksData, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => developerApi.listWebhooks() as any,
    enabled: tab === 'webhooks',
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => developerApi.revokeKey(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key revoked'); },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => developerApi.deleteWebhook(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook deleted'); },
  });

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success('Copied to clipboard');
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-4)}`;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer</h1>
          <p className="text-muted-foreground text-sm mt-1">API keys, webhooks, and integration tools</p>
        </div>
        <a href="https://docs.winkx.ai" target="_blank" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-all">
          <ExternalLink className="w-4 h-4" />API Docs
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {(['keys', 'webhooks', 'docs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'keys' ? '🔑 API Keys' : t === 'webhooks' ? '🔗 Webhooks' : '📖 Quick Start'}
          </button>
        ))}
      </div>

      {/* API KEYS */}
      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{keysData?.keys?.length || 0} keys</p>
            <button onClick={() => setShowKeyModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
              <Plus className="w-4 h-4" />Create API Key
            </button>
          </div>

          {keysLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (keysData?.keys || []).length === 0 ? (
            <div className="text-center py-16 card-premium">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground mb-1">No API keys yet</p>
              <p className="text-sm text-muted-foreground">Create an API key to integrate with your systems</p>
            </div>
          ) : (keysData?.keys || []).map((key: any) => (
            <motion.div key={key.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Key className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{key.name}</p>
                  <p className="text-xs text-muted-foreground">Created {formatRelativeTime(key.createdAt)} · {key.lastUsedAt ? `Last used ${formatRelativeTime(key.lastUsedAt)}` : 'Never used'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted/50 border border-border px-3 py-1.5 rounded-lg text-foreground">
                    {revealedKeys.has(key.id) ? key.key : maskKey(key.key || 'wxk_live_xxxxxxxxxxxxxxxx')}
                  </code>
                  <button onClick={() => toggleReveal(key.id)} className="p-1.5 rounded-lg hover:bg-muted transition-all text-muted-foreground">
                    {revealedKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyKey(key.key || '', key.id)} className="p-1.5 rounded-lg hover:bg-muted transition-all text-muted-foreground">
                    {copiedKey === key.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteKeyMutation.mutate(key.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* WEBHOOKS */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{webhooksData?.webhooks?.length || 0} endpoints</p>
            <button onClick={() => setShowWebhookModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
              <Plus className="w-4 h-4" />Add Webhook
            </button>
          </div>

          {webhooksLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (webhooksData?.webhooks || []).length === 0 ? (
            <div className="text-center py-16 card-premium">
              <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground mb-1">No webhooks yet</p>
              <p className="text-sm text-muted-foreground">Add a webhook to receive real-time events</p>
            </div>
          ) : (webhooksData?.webhooks || []).map((hook: any) => (
            <motion.div key={hook.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center"><Webhook className="w-5 h-5 text-pink-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground font-mono truncate">{hook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(hook.events || []).slice(0, 3).map((e: string) => (
                      <span key={e} className="text-xs bg-muted/50 text-muted-foreground border border-border px-1.5 py-0.5 rounded">{e}</span>
                    ))}
                    {hook.events?.length > 3 && <span className="text-xs text-muted-foreground">+{hook.events.length - 3} more</span>}
                  </div>
                </div>
                <div className={cn('w-2 h-2 rounded-full', hook.isActive ? 'bg-emerald-400' : 'bg-red-400')} />
                <button onClick={() => deleteWebhookMutation.mutate(hook.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QUICK START */}
      {tab === 'docs' && (
        <div className="space-y-6">
          <div className="card-premium p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-primary" />Quick Start</h3>
            <div className="space-y-4">
              {[
                { label: 'Base URL', code: 'https://api.winkx.ai/v1' },
                { label: 'Authentication', code: 'Authorization: Bearer YOUR_API_KEY' },
                { label: 'Send a message', code: `curl -X POST https://api.winkx.ai/v1/messages \\
  -H "Authorization: Bearer wxk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+1234567890", "channel": "WHATSAPP", "message": "Hello!"}'` },
              ].map(({ label, code }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                  <div className="relative">
                    <pre className="bg-muted/50 border border-border rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto scrollbar-thin">{code}</pre>
                    <button onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied!'); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-all text-muted-foreground">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Webhook Events</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                'message.received', 'message.sent', 'message.delivered', 'message.read',
                'conversation.created', 'conversation.resolved', 'flow.triggered', 'lead.created',
                'campaign.sent', 'appointment.booked', 'contact.created',
              ].map(event => (
                <div key={event} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <code className="text-xs font-mono text-foreground">{event}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showKeyModal && <CreateKeyModal onClose={() => setShowKeyModal(false)} onCreated={(key: string) => { setShowKeyModal(false); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key created — copy it now, it won\'t be shown again'); copyKey(key, 'new'); }} />}
      {showWebhookModal && <CreateWebhookModal onClose={() => setShowWebhookModal(false)} onCreated={() => { setShowWebhookModal(false); queryClient.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook created!'); }} />}
    </div>
  );
}

function CreateKeyModal({ onClose, onCreated }: any) {
  const [form, setForm] = useState({ name: '', permissions: ['read', 'write'] });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    setIsLoading(true);
    try {
      const result = await developerApi.createKey(form) as any;
      onCreated(result.key.key);
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-border"><h2 className="text-lg font-bold text-foreground">Create API Key</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Key Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Production API Key" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Permissions</label>
            <div className="flex gap-2">
              {['read', 'write', 'admin'].map(p => (
                <button key={p} onClick={() => { const perms = form.permissions.includes(p) ? form.permissions.filter(x => x !== p) : [...form.permissions, p]; setForm({ ...form, permissions: perms }); }} className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize', form.permissions.includes(p) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}Create Key
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateWebhookModal({ onClose, onCreated }: any) {
  const ALL_EVENTS = ['message.received', 'message.sent', 'conversation.created', 'lead.created', 'flow.triggered', 'campaign.sent', 'appointment.booked'];
  const [form, setForm] = useState({ url: '', events: ['message.received'], secret: '' });
  const [isLoading, setIsLoading] = useState(false);

  const toggleEvent = (e: string) => {
    setForm(prev => ({ ...prev, events: prev.events.includes(e) ? prev.events.filter(x => x !== e) : [...prev.events, e] }));
  };

  const handleCreate = async () => {
    if (!form.url.trim()) return toast.error('URL required');
    setIsLoading(true);
    try {
      await developerApi.createWebhook(form);
      onCreated();
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-border"><h2 className="text-lg font-bold text-foreground">Add Webhook</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Endpoint URL *</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://your-app.com/webhooks" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Events</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_EVENTS.map(e => (
                <button key={e} onClick={() => toggleEvent(e)} className={cn('text-left text-xs px-2.5 py-2 rounded-lg border transition-all', form.events.includes(e) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}Add Webhook
          </button>
        </div>
      </motion.div>
    </div>
  );
}
