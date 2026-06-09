'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

const NODE_CATEGORIES = [
  {
    name: 'Messaging',
    items: [
      { type: 'MESSAGE', label: 'Send Message', icon: '💬', desc: 'Send text, image, video or document', color: '#6366f1' },
      { type: 'BUTTON', label: 'Quick Replies', icon: '🔘', desc: 'Interactive buttons', color: '#3b82f6' },
      { type: 'QUICK_REPLY', label: 'Quick Reply', icon: '⚡', desc: 'Fast reply buttons', color: '#06b6d4' },
    ],
  },
  {
    name: 'Logic',
    items: [
      { type: 'CONDITION', label: 'Condition', icon: '🔀', desc: 'Branch based on rules', color: '#f59e0b' },
      { type: 'DELAY', label: 'Delay', icon: '⏱️', desc: 'Wait before continuing', color: '#06b6d4' },
    ],
  },
  {
    name: 'AI & Automation',
    items: [
      { type: 'AI_AGENT', label: 'AI Agent', icon: '🤖', desc: 'Intelligent conversation', color: '#8b5cf6' },
    ],
  },
  {
    name: 'CRM & Data',
    items: [
      { type: 'CRM_UPDATE', label: 'CRM Update', icon: '📋', desc: 'Create or update records', color: '#f97316' },
      { type: 'SET_VARIABLE', label: 'Set Variable', icon: '📝', desc: 'Store user input', color: '#14b8a6' },
      { type: 'TAG', label: 'Add Tag', icon: '🏷️', desc: 'Tag contact', color: '#a855f7' },
      { type: 'APPOINTMENT', label: 'Book Appointment', icon: '📅', desc: 'Schedule meeting', color: '#22c55e' },
    ],
  },
  {
    name: 'Integrations',
    items: [
      { type: 'WEBHOOK', label: 'Webhook', icon: '🔗', desc: 'Call external API', color: '#ec4899' },
    ],
  },
  {
    name: 'Flow Control',
    items: [
      { type: 'END', label: 'End Flow', icon: '🔴', desc: 'Stop flow execution', color: '#ef4444' },
    ],
  },
];

interface NodePaletteProps {
  onAddNode: (type: string, data?: any) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [search, setSearch] = useState('');

  const filteredCategories = NODE_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Add Nodes</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-muted/50 border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {filteredCategories.map(category => (
          <div key={category.name}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{category.name}</p>
            <div className="space-y-1.5">
              {category.items.map(item => (
                <button
                  key={item.type}
                  onClick={() => onAddNode(item.type, { label: item.label })}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/70 transition-all group text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ background: `${item.color}20` }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground group-hover:text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
