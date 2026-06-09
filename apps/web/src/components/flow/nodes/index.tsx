// All Flow Node Components
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, MessageSquare, GitBranch, Clock, Bot, MousePointer, Webhook, Variable, Database, Tag, Calendar, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeWrapper } from './NodeWrapper';

// START NODE
export const StartNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#10b981" label="Start Trigger" icon={<Zap className="w-3.5 h-3.5 text-emerald-400" />} handles={[{ type: 'source', position: Position.Bottom, id: 'output' }]}>
    <Handle type="target" position={Position.Top} id="input" className="!opacity-0 !pointer-events-none" />
    <div className="text-xs text-muted-foreground">
      <p className="font-medium text-foreground mb-1">{data.triggerType || 'KEYWORD'}</p>
      {data.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.keywords.slice(0, 3).map((kw: string) => (
            <span key={kw} className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-xs border border-emerald-500/20">{kw}</span>
          ))}
          {data.keywords.length > 3 && <span className="text-emerald-400 text-xs">+{data.keywords.length - 3}</span>}
        </div>
      )}
      {!data.keywords?.length && <p className="text-muted-foreground italic">No keywords set</p>}
    </div>
  </NodeWrapper>
));
StartNode.displayName = 'StartNode';

// MESSAGE NODE
export const MessageNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#6366f1" label={data.label || 'Send Message'} icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <p className="text-xs text-foreground line-clamp-3">
      {data.message || <span className="text-muted-foreground italic">No message set</span>}
    </p>
    {data.mediaUrl && (
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <span>📎</span>
        <span className="truncate">Media attached</span>
      </div>
    )}
  </NodeWrapper>
));
MessageNode.displayName = 'MessageNode';

// CONDITION NODE
export const ConditionNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#f59e0b" label={data.label || 'Condition'} icon={<GitBranch className="w-3.5 h-3.5 text-amber-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'true', className: '!left-[30%]' },
      { type: 'source', position: Position.Bottom, id: 'false', className: '!left-[70%]' },
    ]}>
    <p className="text-xs text-foreground mb-2">{data.conditionText || 'Set condition...'}</p>
    <div className="flex justify-between text-xs">
      <span className="text-emerald-400 font-medium">✓ True</span>
      <span className="text-red-400 font-medium">✗ False</span>
    </div>
  </NodeWrapper>
));
ConditionNode.displayName = 'ConditionNode';

// BUTTON/QUICK REPLY NODE
export const ButtonNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#3b82f6" label={data.label || 'Buttons'} icon={<MousePointer className="w-3.5 h-3.5 text-blue-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <p className="text-xs text-foreground mb-2">{data.message || 'Choose an option:'}</p>
    <div className="space-y-1">
      {(data.buttons || []).slice(0, 3).map((btn: any, i: number) => (
        <div key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-2 py-1">
          {btn.text}
        </div>
      ))}
      {(!data.buttons || data.buttons.length === 0) && (
        <div className="text-xs text-muted-foreground italic">No buttons added</div>
      )}
    </div>
  </NodeWrapper>
));
ButtonNode.displayName = 'ButtonNode';

// AI AGENT NODE
export const AIAgentNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#8b5cf6" label={data.label || 'AI Agent'} icon={<Bot className="w-3.5 h-3.5 text-violet-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
      { type: 'source', position: Position.Right, id: 'handoff' },
    ]}>
    <p className="text-xs font-medium text-foreground">{data.agentName || 'Select AI Agent'}</p>
    <p className="text-xs text-muted-foreground mt-1">{data.provider || 'OpenAI'} · {data.model || 'gpt-4o'}</p>
    <div className="mt-2 flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      <span className="text-xs text-violet-400">Active</span>
    </div>
  </NodeWrapper>
));
AIAgentNode.displayName = 'AIAgentNode';

// DELAY NODE
export const DelayNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#06b6d4" label="Delay" icon={<Clock className="w-3.5 h-3.5 text-cyan-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <p className="text-xl font-bold text-foreground text-center">
      {data.value || '0'}{data.unit || 's'}
    </p>
    <p className="text-xs text-muted-foreground text-center">wait</p>
  </NodeWrapper>
));
DelayNode.displayName = 'DelayNode';

// WEBHOOK NODE
export const WebhookNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#ec4899" label="Webhook" icon={<Webhook className="w-3.5 h-3.5 text-pink-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <p className="text-xs text-muted-foreground font-mono truncate">{data.url || 'https://...'}</p>
    <span className="text-xs bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded mt-1 inline-block border border-pink-500/20">
      {data.method || 'POST'}
    </span>
  </NodeWrapper>
));
WebhookNode.displayName = 'WebhookNode';

// SET VARIABLE NODE
export const SetVariableNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#14b8a6" label="Set Variable" icon={<Variable className="w-3.5 h-3.5 text-teal-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <div className="text-xs">
      <span className="text-teal-400 font-mono">{`{{${data.variable || 'variable'}}}`}</span>
      <span className="text-muted-foreground mx-1">=</span>
      <span className="text-foreground">{data.captureInput ? '(user input)' : data.value || 'value'}</span>
    </div>
  </NodeWrapper>
));
SetVariableNode.displayName = 'SetVariableNode';

// CRM UPDATE NODE
export const CRMUpdateNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#f97316" label="CRM Update" icon={<Database className="w-3.5 h-3.5 text-orange-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <p className="text-xs font-medium text-foreground capitalize">{(data.action || 'create_lead').replace(/_/g, ' ')}</p>
    {data.fields && Object.keys(data.fields).length > 0 && (
      <div className="mt-1 text-xs text-muted-foreground">
        {Object.keys(data.fields).slice(0, 2).join(', ')}
      </div>
    )}
  </NodeWrapper>
));
CRMUpdateNode.displayName = 'CRMUpdateNode';

// TAG NODE
export const TagNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#a855f7" label="Add Tag" icon={<Tag className="w-3.5 h-3.5 text-purple-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'output' },
    ]}>
    <div className="flex flex-wrap gap-1">
      {(data.tags || []).map((tag: string) => (
        <span key={tag} className="text-xs bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
          {tag}
        </span>
      ))}
      {(!data.tags || data.tags.length === 0) && <span className="text-xs text-muted-foreground italic">No tags</span>}
    </div>
  </NodeWrapper>
));
TagNode.displayName = 'TagNode';

// APPOINTMENT NODE
export const AppointmentNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#22c55e" label="Book Appointment" icon={<Calendar className="w-3.5 h-3.5 text-emerald-400" />}
    handles={[
      { type: 'target', position: Position.Top, id: 'input' },
      { type: 'source', position: Position.Bottom, id: 'booked' },
      { type: 'source', position: Position.Right, id: 'cancelled' },
    ]}>
    <p className="text-xs font-medium text-foreground">{data.calendarProvider || 'Google Calendar'}</p>
    <p className="text-xs text-muted-foreground mt-1">{data.duration || '30'} min slots</p>
  </NodeWrapper>
));
AppointmentNode.displayName = 'AppointmentNode';

// END NODE
export const EndNode = memo(({ data, selected }: NodeProps) => (
  <NodeWrapper selected={selected} color="#ef4444" label="End" icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
    handles={[{ type: 'target', position: Position.Top, id: 'input' }]}>
    <p className="text-xs text-muted-foreground text-center">{data.message || 'Flow complete'}</p>
  </NodeWrapper>
));
EndNode.displayName = 'EndNode';
