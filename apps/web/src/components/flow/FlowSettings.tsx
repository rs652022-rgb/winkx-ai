'use client';

import { X } from 'lucide-react';

interface FlowSettingsProps {
  flowMeta: any;
  onUpdate: (data: any) => void;
  onClose: () => void;
}

export function FlowSettings({ flowMeta, onUpdate, onClose }: FlowSettingsProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Flow Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Flow Name</label>
            <input value={flowMeta.name || ''} onChange={e => onUpdate({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Description</label>
            <textarea value={flowMeta.description || ''} onChange={e => onUpdate({ description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Trigger Type</label>
            <select value={flowMeta.triggerType || 'KEYWORD'} onChange={e => onUpdate({ triggerType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all">
              <option value="KEYWORD">Keyword</option>
              <option value="OPTIN">Opt-in</option>
              <option value="ANY_MESSAGE">Any Message</option>
              <option value="WELCOME">Welcome Message</option>
              <option value="COMMENT_REPLY">Comment Reply</option>
              <option value="STORY_MENTION">Story Mention</option>
            </select>
          </div>
        </div>
        <div className="p-6 pt-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">Done</button>
        </div>
      </div>
    </div>
  );
}
