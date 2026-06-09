'use client';

import { X, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NodeConfigPanelProps {
  node: any;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const [data, setData] = useState(node.data || {});

  useEffect(() => {
    setData(node.data || {});
  }, [node.id]);

  const update = (field: string, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onUpdate(newData);
  };

  const renderConfig = () => {
    switch (node.type) {
      case 'START':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Trigger Type</label>
              <select value={data.triggerType || 'KEYWORD'} onChange={e => update('triggerType', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
                <option value="KEYWORD">Keyword</option>
                <option value="OPTIN">Opt-in</option>
                <option value="ANY_MESSAGE">Any Message</option>
                <option value="WELCOME">Welcome</option>
                <option value="COMMENT_REPLY">Comment Reply</option>
                <option value="STORY_MENTION">Story Mention</option>
                <option value="STORY_REPLY">Story Reply</option>
              </select>
            </div>
            {data.triggerType === 'KEYWORD' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Keywords (comma separated)</label>
                <input
                  value={(data.keywords || []).join(', ')}
                  onChange={e => update('keywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))}
                  placeholder="hello, hi, start"
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            )}
          </div>
        );

      case 'MESSAGE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Message Type</label>
              <select value={data.messageType || 'TEXT'} onChange={e => update('messageType', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
                <option value="AUDIO">Audio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Message Text</label>
              <textarea value={data.message || ''} onChange={e => update('message', e.target.value)} placeholder="Type your message... Use {{name}}, {{email}} for variables" rows={4} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none font-mono" />
            </div>
            {data.messageType !== 'TEXT' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Media URL</label>
                <input value={data.mediaUrl || ''} onChange={e => update('mediaUrl', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            )}
          </div>
        );

      case 'BUTTON':
      case 'QUICK_REPLY':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Message</label>
              <textarea value={data.message || ''} onChange={e => update('message', e.target.value)} placeholder="Choose an option:" rows={2} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">Buttons</label>
                <button onClick={() => update('buttons', [...(data.buttons || []), { text: '', payload: '' }])} className="text-xs text-primary hover:text-primary/80">+ Add</button>
              </div>
              <div className="space-y-2">
                {(data.buttons || []).map((btn: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input value={btn.text} onChange={e => { const btns = [...data.buttons]; btns[i] = { ...btn, text: e.target.value }; update('buttons', btns); }} placeholder="Button text" className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all" />
                    <button onClick={() => update('buttons', data.buttons.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'CONDITION':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Variable</label>
              <input value={data.variable || ''} onChange={e => update('variable', e.target.value)} placeholder="e.g., last_message" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Operator</label>
              <select value={data.operator || 'EQUALS'} onChange={e => update('operator', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
                <option value="EQUALS">Equals</option>
                <option value="NOT_EQUALS">Not Equals</option>
                <option value="CONTAINS">Contains</option>
                <option value="NOT_CONTAINS">Not Contains</option>
                <option value="STARTS_WITH">Starts With</option>
                <option value="GT">Greater Than</option>
                <option value="LT">Less Than</option>
                <option value="IS_EMPTY">Is Empty</option>
                <option value="NOT_EMPTY">Not Empty</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Value</label>
              <input value={data.value || ''} onChange={e => update('value', e.target.value)} placeholder="Enter value to compare" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>
        );

      case 'DELAY':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Wait Duration</label>
              <div className="flex gap-2">
                <input type="number" min="1" value={data.value || 1} onChange={e => update('value', Number(e.target.value))} className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                <select value={data.unit || 'minutes'} onChange={e => update('unit', e.target.value)} className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'AI_AGENT':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">System Prompt</label>
              <textarea value={data.systemPrompt || ''} onChange={e => update('systemPrompt', e.target.value)} placeholder="You are a helpful assistant for [company]..." rows={4} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Handoff Keywords (comma separated)</label>
              <input value={(data.handoffKeywords || []).join(', ')} onChange={e => update('handoffKeywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))} placeholder="human, agent, help" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>
        );

      case 'WEBHOOK':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">URL</label>
              <input value={data.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://api.example.com/endpoint" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Method</label>
              <select value={data.method || 'POST'} onChange={e => update('method', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Body (JSON)</label>
              <textarea value={data.body || ''} onChange={e => update('body', e.target.value)} placeholder='{"key": "{{variable}}"}' rows={3} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all resize-none font-mono" />
            </div>
          </div>
        );

      case 'SET_VARIABLE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Variable Name</label>
              <input value={data.variable || ''} onChange={e => update('variable', e.target.value)} placeholder="user_name" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.captureInput || false} onChange={e => update('captureInput', e.target.checked)} className="rounded" />
              <span className="text-sm text-foreground">Capture from user input</span>
            </label>
            {!data.captureInput && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Value</label>
                <input value={data.value || ''} onChange={e => update('value', e.target.value)} placeholder="Static value or {{variable}}" className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Label</label>
            <input value={data.label || ''} onChange={e => update('label', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Configure Node</h3>
          <p className="text-xs text-muted-foreground">{node.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {renderConfig()}
      </div>
    </div>
  );
}
