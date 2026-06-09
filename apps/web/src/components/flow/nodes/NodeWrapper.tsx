'use client';

import { Handle, Position } from 'reactflow';
import { Zap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeWrapperProps {
  children: React.ReactNode;
  selected?: boolean;
  color?: string;
  icon?: React.ReactNode;
  label?: string;
  handles?: { type: 'source' | 'target'; position: Position; id?: string; className?: string }[];
}

export function NodeWrapper({ children, selected, color = '#6366f1', icon, label, handles }: NodeWrapperProps) {
  return (
    <div className={cn(
      'flow-node min-w-[200px] max-w-[280px] overflow-hidden transition-all',
      selected ? 'border-primary shadow-glow scale-[1.02]' : 'border-border hover:border-border/80'
    )}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}20` }}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-foreground flex-1 truncate">{label}</span>
      </div>

      {/* Body */}
      <div className="p-3">{children}</div>

      {/* Handles */}
      {handles?.map((h, i) => (
        <Handle
          key={i}
          type={h.type}
          position={h.position}
          id={h.id}
          className={cn(
            '!w-3 !h-3 !border-2 !border-background transition-all',
            h.type === 'source' ? '!bg-primary hover:!bg-primary/80' : '!bg-muted-foreground hover:!bg-foreground',
            h.className
          )}
        />
      ))}
    </div>
  );
}
