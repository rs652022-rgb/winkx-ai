'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Store, Search, Filter, Star, Download, Loader2, Eye, Tag,
  MessageSquare, GitBranch, Users, TrendingUp, X, Sparkles,
} from 'lucide-react';
import { templatesApi } from '@/lib/api';
import { formatNumber, cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '🌟' },
  { id: 'lead_generation', label: 'Lead Generation', icon: '🎯' },
  { id: 'e_commerce', label: 'E-Commerce', icon: '🛒' },
  { id: 'customer_support', label: 'Customer Support', icon: '🤝' },
  { id: 'appointment_booking', label: 'Appointments', icon: '📅' },
  { id: 'event_registration', label: 'Events', icon: '🎪' },
  { id: 'giveaway', label: 'Giveaways', icon: '🎁' },
  { id: 'onboarding', label: 'Onboarding', icon: '👋' },
  { id: 'feedback', label: 'Feedback', icon: '⭐' },
];

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates', category, search],
    queryFn: () => templatesApi.list({
      category: category !== 'all' ? category : undefined,
      search: search || undefined,
      limit: 24,
    }) as any,
  });

  const templates = data?.templates || [];
  const categories = data?.categories || [];

  const handleImport = async (templateId: string) => {
    setImporting(templateId);
    try {
      const result = await templatesApi.import(templateId) as any;
      toast.success('Template imported! Redirecting to flow builder...');
      setTimeout(() => window.location.href = `/flows/${result.flow.id}`, 1000);
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(null);
    }
  };

  const CHANNEL_EMOJI: Record<string, string> = {
    WHATSAPP: '💬', INSTAGRAM: '📸', FACEBOOK: '👍',
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4" />Templates
          </h2>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left', category === cat.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
              <span>{cat.icon}</span>
              <span className="truncate">{cat.label}</span>
              {categories.find((c: any) => c.category === cat.id) && (
                <span className="ml-auto text-xs text-muted-foreground">{categories.find((c: any) => c.category === cat.id)?.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <p className="text-sm text-muted-foreground">{templates.length} templates</p>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((t: any, i: number) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card-premium overflow-hidden group hover:shadow-glow hover:border-primary/30 transition-all cursor-pointer" onClick={() => setSelectedTemplate(t)}>
                  {/* Preview */}
                  <div className="h-32 bg-gradient-to-br from-primary-500/10 via-violet-500/10 to-purple-500/10 flex items-center justify-center relative">
                    <GitBranch className="w-12 h-12 text-primary/30" />
                    {t.isPremium && (
                      <span className="absolute top-2 right-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">PRO</span>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {(t.channelTypes || []).map((ch: string) => (
                        <span key={ch} title={ch}>{CHANNEL_EMOJI[ch] || '💬'}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium">{t.rating?.toFixed(1) || '—'}</span>
                        <span className="text-xs text-muted-foreground">({t.ratingCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="w-3 h-3" />
                        {formatNumber(t.usageCount)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleImport(t.id); }}
                      disabled={importing === t.id}
                      className="w-full py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {importing === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Use Template
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Drawer */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground text-lg">{selectedTemplate.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.category}</p>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">{selectedTemplate.description}</p>
              <div className="flex flex-wrap gap-2">
                {(selectedTemplate.tags || []).map((tag: string) => (
                  <span key={tag} className="text-xs bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full border border-border">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span>{selectedTemplate.rating?.toFixed(1) || '—'}</span></div>
                <div className="flex items-center gap-1.5"><Download className="w-4 h-4 text-muted-foreground" /><span>{formatNumber(selectedTemplate.usageCount)} uses</span></div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setSelectedTemplate(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm">Cancel</button>
              <button onClick={() => handleImport(selectedTemplate.id)} disabled={importing === selectedTemplate.id} className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2">
                {importing === selectedTemplate.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Import Template
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
