'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Sparkles, X, Loader2, ChevronDown } from 'lucide-react';

interface AIGeneratorPanelProps {
  onGenerate: (prompt: string, provider: string) => void;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  'Instagram lead generation funnel for a real estate company with qualification questions and appointment booking',
  'WhatsApp abandoned cart recovery flow for an e-commerce store',
  'Facebook Messenger welcome flow for a restaurant with menu, reservations and deals',
  'Instagram giveaway automation with follow/comment verification and winner selection',
  'WhatsApp customer support bot for a SaaS product with FAQ and human handoff',
  'Lead qualification bot for a coaching business with discovery call booking',
];

export function AIGeneratorPanel({ onGenerate, onClose }: AIGeneratorPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('openai');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerate(prompt, provider);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary-500/10 to-violet-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">AI Flow Generator</h2>
                <p className="text-xs text-muted-foreground">Describe your automation and AI will build it</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Describe your automation</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g., Create an Instagram lead generation funnel for a fitness coaching business that captures name, email, fitness goal, and books a free consultation call"
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{prompt.length}/1000 characters</p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">AI Provider</label>
            <div className="flex gap-2">
              {[
                { id: 'openai', name: 'OpenAI GPT-4o', icon: '⚡' },
                { id: 'anthropic', name: 'Claude 3.5', icon: '🧠' },
                { id: 'gemini', name: 'Gemini Pro', icon: '💎' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    provider === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">✨ Example prompts</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all truncate"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex-1 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Flow
          </button>
        </div>
      </motion.div>
    </div>
  );
}
