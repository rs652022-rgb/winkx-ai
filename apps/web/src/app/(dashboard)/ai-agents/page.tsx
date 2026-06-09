'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Bot, Plus, Brain, BookOpen, FileText, Trash2, Upload, Link,
  Loader2, Check, AlertCircle, ChevronRight, Sparkles, Settings,
  MessageSquare, Zap,
} from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function AIAgentsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'agents' | 'knowledge'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedKB, setSelectedKB] = useState<any>(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateKB, setShowCreateKB] = useState(false);

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list() as any,
  });

  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => agentsApi.knowledgeBases() as any,
  });

  const { data: docsData } = useQuery({
    queryKey: ['kb-docs', selectedKB?.id],
    queryFn: () => agentsApi.kbDocuments(selectedKB!.id) as any,
    enabled: !!selectedKB?.id,
  });

  const agents = agentsData?.agents || [];
  const knowledgeBases = kbData?.knowledgeBases || [];
  const docs = docsData?.documents || [];

  const toggleAgentMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => agentsApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSelectedAgent(null);
      toast.success('Agent deleted');
    },
  });

  const addDocMutation = useMutation({
    mutationFn: ({ kbId, data }: any) => agentsApi.addDocument(kbId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-docs', selectedKB?.id] });
      toast.success('Document added — processing...');
    },
  });

  const SOURCE_ICONS: Record<string, string> = {
    PDF: '📄', DOCX: '📝', TXT: '📃', CSV: '📊',
    URL: '🔗', NOTION: '📓', PLAIN_TEXT: '✏️',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">Build intelligent chatbots powered by your knowledge base</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateKB(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-all">
            <BookOpen className="w-4 h-4" />New Knowledge Base
          </button>
          <button onClick={() => setShowCreateAgent(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-glow">
            <Plus className="w-4 h-4" />New Agent
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {(['agents', 'knowledge'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'agents' ? '🤖 Agents' : '📚 Knowledge Bases'}
          </button>
        ))}
      </div>

      {/* AGENTS TAB */}
      {tab === 'agents' && (
        agentsLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No AI agents yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first AI-powered chatbot</p>
            <button onClick={() => setShowCreateAgent(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all">Create Agent</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any, i: number) => (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-premium p-5 group hover:shadow-glow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAgentMutation.mutate({ id: agent.id, isActive: !agent.isActive })}
                      className={cn('relative w-10 h-5 rounded-full transition-all', agent.isActive ? 'bg-emerald-500' : 'bg-muted')}
                    >
                      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm', agent.isActive ? 'left-5' : 'left-0.5')} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description || agent.personality || 'No description'}</p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg border border-primary/20 font-mono">{agent.model || 'gpt-4o'}</span>
                  <span className="text-xs text-muted-foreground">{agent.provider}</span>
                </div>

                {agent.knowledgeBase && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground">{agent.knowledgeBase.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{agent.knowledgeBase._count?.documents} docs</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setSelectedAgent(agent)} className="flex-1 py-2 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium transition-all flex items-center justify-center gap-1">
                    <Settings className="w-3.5 h-3.5" />Configure
                  </button>
                  <button onClick={() => deleteAgentMutation.mutate(agent.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* KNOWLEDGE BASES TAB */}
      {tab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KB List */}
          <div className="space-y-3">
            {kbLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : knowledgeBases.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No knowledge bases yet</p>
              </div>
            ) : knowledgeBases.map((kb: any) => (
              <button key={kb.id} onClick={() => setSelectedKB(kb)} className={cn('w-full text-left p-4 rounded-xl border transition-all', selectedKB?.id === kb.id ? 'bg-primary/5 border-primary/30' : 'bg-card border-border hover:border-border/80')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Brain className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{kb.name}</p>
                    <p className="text-xs text-muted-foreground">{kb._count?.documents} documents</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Documents Panel */}
          {selectedKB ? (
            <div className="lg:col-span-2 card-premium p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedKB.name}</h3>
                  <p className="text-xs text-muted-foreground">{docs.length} documents</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { type: 'URL', icon: Link, label: 'Add URL' },
                    { type: 'PLAIN_TEXT', icon: FileText, label: 'Add Text' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button key={type} onClick={() => addDocMutation.mutate({ kbId: selectedKB.id, data: { name: 'New doc', sourceType: type, content: '' } })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground text-xs hover:bg-muted transition-all">
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {docs.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No documents yet</p>
                  <p className="text-xs text-muted-foreground">Upload PDFs, add URLs or paste text to train your agent</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all">
                      <span className="text-xl">{SOURCE_ICONS[doc.sourceType] || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.sourceType} · {formatRelativeTime(doc.createdAt)}</p>
                      </div>
                      <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', doc.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400' : doc.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400')}>
                        {doc.status === 'READY' ? <Check className="w-3 h-3" /> : doc.status === 'PROCESSING' ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                        {doc.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 card-premium flex items-center justify-center p-12">
              <div className="text-center">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a knowledge base to manage documents</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateAgent && <CreateAgentModal knowledgeBases={knowledgeBases} onClose={() => setShowCreateAgent(false)} onCreated={() => { queryClient.invalidateQueries({ queryKey: ['agents'] }); setShowCreateAgent(false); toast.success('Agent created!'); }} />}

      {/* Create KB Modal */}
      {showCreateKB && <CreateKBModal onClose={() => setShowCreateKB(false)} onCreated={() => { queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] }); setShowCreateKB(false); toast.success('Knowledge base created!'); }} />}
    </div>
  );
}

function CreateAgentModal({ knowledgeBases, onClose, onCreated }: any) {
  const [form, setForm] = useState({ name: '', description: '', provider: 'OPENAI', model: 'gpt-4o', temperature: 0.7, systemPrompt: '', knowledgeBaseId: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Agent name required');
    setIsLoading(true);
    try {
      await agentsApi.create(form);
      onCreated();
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Create AI Agent</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><Bot className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Agent Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer Support Bot" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Provider</label>
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                <option value="OPENAI">OpenAI</option>
                <option value="ANTHROPIC">Anthropic</option>
                <option value="GEMINI">Google Gemini</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Model</label>
              <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">System Prompt</label>
            <textarea value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} placeholder="You are a helpful customer support agent for [company]. Always be polite and professional..." rows={4} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
          </div>
          {knowledgeBases.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Knowledge Base (optional)</label>
              <select value={form.knowledgeBaseId} onChange={e => setForm({ ...form, knowledgeBaseId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none">
                <option value="">None</option>
                {knowledgeBases.map((kb: any) => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Create Agent
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateKBModal({ onClose, onCreated }: any) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Name required');
    setIsLoading(true);
    try { await agentsApi.createKB({ name }); onCreated(); }
    catch (e: any) { toast.error(e.message || 'Failed'); } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 border-b border-border"><h2 className="text-lg font-bold text-foreground">New Knowledge Base</h2></div>
        <div className="p-6">
          <label className="block text-xs font-medium text-foreground mb-2">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Product FAQ" className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}
