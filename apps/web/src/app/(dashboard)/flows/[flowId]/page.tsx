'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge, Background, Controls, MiniMap, useNodesState, useEdgesState,
  Connection, Edge, NodeTypes, BackgroundVariant, Panel, ReactFlowProvider,
  applyNodeChanges, applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Play, Pause, Undo, Redo, Copy, Trash2, Sparkles, ChevronLeft,
  Plus, Settings, GitBranch, Clock, Loader2, Download, Upload, History,
} from 'lucide-react';
import { flowsApi, aiApi } from '@/lib/api';

// Custom node components
import { StartNode } from '@/components/flow/nodes/StartNode';
import { MessageNode } from '@/components/flow/nodes/MessageNode';
import { ConditionNode } from '@/components/flow/nodes/ConditionNode';
import { ButtonNode } from '@/components/flow/nodes/ButtonNode';
import { AIAgentNode } from '@/components/flow/nodes/AIAgentNode';
import { DelayNode } from '@/components/flow/nodes/DelayNode';
import { EndNode } from '@/components/flow/nodes/EndNode';
import { WebhookNode } from '@/components/flow/nodes/WebhookNode';
import { SetVariableNode } from '@/components/flow/nodes/SetVariableNode';
import { CRMUpdateNode } from '@/components/flow/nodes/CRMUpdateNode';
import { TagNode } from '@/components/flow/nodes/TagNode';
import { AppointmentNode } from '@/components/flow/nodes/AppointmentNode';
import { NodePalette } from '@/components/flow/NodePalette';
import { AIGeneratorPanel } from '@/components/flow/AIGeneratorPanel';
import { FlowSettings } from '@/components/flow/FlowSettings';
import { NodeConfigPanel } from '@/components/flow/NodeConfigPanel';

const nodeTypes: NodeTypes = {
  START: StartNode,
  MESSAGE: MessageNode,
  CONDITION: ConditionNode,
  BUTTON: ButtonNode,
  QUICK_REPLY: ButtonNode,
  AI_AGENT: AIAgentNode,
  DELAY: DelayNode,
  END: EndNode,
  WEBHOOK: WebhookNode,
  SET_VARIABLE: SetVariableNode,
  CRM_UPDATE: CRMUpdateNode,
  TAG: TagNode,
  APPOINTMENT: AppointmentNode,
};

function FlowBuilderInner() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flowId = params.flowId as string;
  const isNew = flowId === 'new';

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [flowMeta, setFlowMeta] = useState<any>({ name: 'Untitled Flow', status: 'DRAFT' });
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const autosaveTimer = useRef<NodeJS.Timeout>();

  const { data: flowData, isLoading } = useQuery({
    queryKey: ['flow', flowId],
    queryFn: () => flowsApi.get(flowId) as any,
    enabled: !isNew,
  });

  useEffect(() => {
    if (flowData?.flow) {
      const flow = flowData.flow;
      setFlowMeta({ name: flow.name, status: flow.status, description: flow.description, triggerType: flow.triggerType });

      const rfNodes = flow.nodes.map((n: any) => ({
        id: n.nodeId,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: n.data,
      }));

      const rfEdges = flow.edges.map((e: any) => ({
        id: e.edgeId,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        data: e.data,
        type: 'smoothstep',
        animated: false,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } else if (isNew) {
      // Default starter flow
      setNodes([{
        id: 'start-1',
        type: 'START',
        position: { x: 300, y: 100 },
        data: { label: 'Start Trigger', triggerType: 'KEYWORD', keywords: [] },
      }]);
    }
  }, [flowData, isNew]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNew) {
        return flowsApi.create(data);
      }
      return flowsApi.update(flowId, data);
    },
    onSuccess: (result: any) => {
      setIsDirty(false);
      toast.success('Flow saved');
      if (isNew && result.flow?.id) {
        router.replace(`/flows/${result.flow.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    },
    onError: () => toast.error('Failed to save flow'),
  });

  const handleSave = useCallback(() => {
    const data = {
      ...flowMeta,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        data: e.data,
      })),
      saveVersion: true,
    };
    saveMutation.mutate(data);
  }, [nodes, edges, flowMeta, isNew]);

  // Autosave
  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!isNew) handleSave();
    }, 3000);
    return () => clearTimeout(autosaveTimer.current);
  }, [isDirty, nodes, edges]);

  const onConnect = useCallback((connection: Connection) => {
    const edge = { ...connection, type: 'smoothstep', animated: false, id: `edge-${Date.now()}` };
    setEdges(eds => addEdge(edge, eds));
    setIsDirty(true);
  }, [setEdges]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    const significantChange = changes.some((c: any) => c.type !== 'select');
    if (significantChange) setIsDirty(true);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    const significantChange = changes.some((c: any) => c.type !== 'select');
    if (significantChange) setIsDirty(true);
  }, [onEdgesChange]);

  const handleNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback((type: string, data: any = {}) => {
    const id = `${type.toLowerCase()}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: {
        x: Math.random() * 200 + 200,
        y: (nodes.length * 150) + 100,
      },
      data: { label: type, ...data },
    };
    setNodes(nds => [...nds, newNode]);
    setIsDirty(true);
  }, [nodes, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setIsDirty(true);
  }, [selectedNode, setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
    setIsDirty(true);
  }, [setNodes]);

  const handleAIGenerate = async (prompt: string, provider: string) => {
    setIsAIGenerating(true);
    setShowAIPanel(false);
    toast.info('AI is generating your flow...', { duration: 10000, id: 'ai-gen' });
    try {
      const result = await aiApi.generateFlow({ prompt, channelType: 'INSTAGRAM', provider }) as any;
      if (result.flow) {
        const rfNodes = result.flow.nodes.map((n: any) => ({
          id: n.nodeId,
          type: n.type,
          position: { x: n.positionX, y: n.positionY },
          data: n.data,
        }));
        const rfEdges = result.flow.edges.map((e: any) => ({
          id: e.edgeId,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: 'smoothstep',
        }));
        setNodes(rfNodes);
        setEdges(rfEdges);
        setFlowMeta({ ...flowMeta, name: result.flow.name });
        toast.success('Flow generated!', { id: 'ai-gen' });
        if (result.flow.id) {
          router.replace(`/flows/${result.flow.id}`);
        }
      }
    } catch {
      toast.error('AI generation failed', { id: 'ai-gen' });
    } finally {
      setIsAIGenerating(false);
    }
  };

  const toggleFlow = async () => {
    if (isNew) return toast.error('Save the flow first');
    try {
      const result = await flowsApi.toggle(flowId) as any;
      setFlowMeta({ ...flowMeta, status: result.flow.status });
      toast.success(`Flow ${result.flow.status === 'ACTIVE' ? 'activated' : 'paused'}`);
    } catch {
      toast.error('Failed to toggle flow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-2 shrink-0">
        <button
          onClick={() => router.push('/flows')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mr-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Flows
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Flow name */}
        <input
          value={flowMeta.name}
          onChange={e => { setFlowMeta({ ...flowMeta, name: e.target.value }); setIsDirty(true); }}
          className="text-sm font-semibold bg-transparent border-none outline-none text-foreground focus:bg-muted px-2 py-1 rounded transition-all"
        />

        {isDirty && <span className="text-xs text-amber-400">Unsaved</span>}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowAIPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all shadow-glow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Generate
          </button>

          <button
            onClick={toggleFlow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              flowMeta.status === 'ACTIVE'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {flowMeta.status === 'ACTIVE' ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Activate</>}
          </button>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Node Palette */}
        <AnimatePresence>
          {showPalette && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              className="w-64 border-r border-border bg-card overflow-y-auto scrollbar-thin shrink-0 z-10"
            >
              <NodePalette onAddNode={addNode} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ReactFlow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="hsl(var(--border))" gap={24} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="m-4" />
            <MiniMap
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  START: '#10b981', MESSAGE: '#6366f1', CONDITION: '#f59e0b',
                  END: '#ef4444', AI_AGENT: '#8b5cf6', BUTTON: '#3b82f6',
                };
                return colors[n.type || ''] || '#6b7280';
              }}
              className="m-4"
            />
            <Panel position="top-left" className="m-4">
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-all text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {showPalette ? 'Hide' : 'Add'} Nodes
              </button>
            </Panel>
          </ReactFlow>

          {isAIGenerating && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-semibold text-foreground">AI is crafting your flow...</p>
                <p className="text-sm text-muted-foreground">This takes about 10-20 seconds</p>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Node Config Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="w-80 border-l border-border bg-card overflow-y-auto scrollbar-thin shrink-0 z-10"
            >
              <NodeConfigPanel
                node={selectedNode}
                onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                onDelete={deleteSelectedNode}
                onClose={() => setSelectedNode(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Generator Panel */}
      <AnimatePresence>
        {showAIPanel && (
          <AIGeneratorPanel
            onGenerate={handleAIGenerate}
            onClose={() => setShowAIPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}
