'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  Search, Filter, ChevronDown, Send, Paperclip, Smile, MoreVertical,
  Phone, Video, Info, Tag, Archive, Trash2, UserCheck, Clock, Check,
  CheckCheck, Image, MessageSquare, AlertCircle, Loader2, Bot, X,
} from 'lucide-react';
import { inboxApi } from '@/lib/api';
import { formatRelativeTime, CHANNEL_COLORS, CHANNEL_ICONS, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

export default function InboxPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout>();

  // Fetch conversations
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations', statusFilter, search],
    queryFn: () => inboxApi.conversations({ status: statusFilter, search, limit: 50 }) as any,
    refetchInterval: 30000,
  });

  // Fetch active conversation messages
  const { data: convoData } = useQuery({
    queryKey: ['conversation', activeConversation?.id],
    queryFn: () => inboxApi.conversation(activeConversation.id) as any,
    enabled: !!activeConversation?.id,
    refetchInterval: false,
  });

  const conversations = conversationsData?.conversations || [];
  const messages = convoData?.messages || [];

  // Socket setup
  useEffect(() => {
    const token = localStorage.getItem('winkx_token');
    if (!token) return;

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
    });

    s.on('connect', () => {});
    s.on('message:new', (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (data.conversationId === activeConversation?.id) {
        queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      }
    });
    s.on('typing:start', (data) => setTypingUsers(prev => [...new Set([...prev, data.name])]));
    s.on('typing:stop', (data) => setTypingUsers(prev => prev.filter(n => n !== data.name)));

    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join:conversation', activeConversation.id);
    }
  }, [socket, activeConversation?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => inboxApi.sendMessage(activeConversation!.id, { content, type: 'TEXT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', activeConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput('');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const handleSend = () => {
    if (!messageInput.trim() || !activeConversation) return;
    sendMutation.mutate(messageInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (!socket || !activeConversation) return;
    socket.emit('typing:start', { conversationId: activeConversation.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation.id });
    }, 2000);
  };

  const updateStatus = async (status: string) => {
    if (!activeConversation) return;
    try {
      await inboxApi.updateStatus(activeConversation.id, status);
      setActiveConversation({ ...activeConversation, status });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Conversation ${status.toLowerCase()}`);
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversation List */}
      <div className="w-72 lg:w-80 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Inbox</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border">
          {['OPEN', 'WAITING', 'RESOLVED', 'ALL'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={cn('flex-1 py-2.5 text-xs font-medium transition-all', statusFilter === status ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Conversation items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No conversations</p>
            </div>
          ) : (
            conversations.map((conv: any) => (
              <button key={conv.id} onClick={() => setActiveConversation(conv)} className={cn('w-full text-left p-4 hover:bg-muted/50 transition-all border-b border-border/50', activeConversation?.id === conv.id && 'bg-muted/70')}>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                      {conv.contact?.firstName?.charAt(0) || '?'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: CHANNEL_COLORS[conv.channel?.type] + '30', border: `1px solid ${CHANNEL_COLORS[conv.channel?.type]}50` }}>
                      {CHANNEL_ICONS[conv.channel?.type] || '💬'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.contact?.firstName || conv.contact?.phone || 'Unknown'}
                        {conv.contact?.lastName ? ` ${conv.contact.lastName}` : ''}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">{formatRelativeTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage?.content || 'No messages yet'}</p>
                    {!conv.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1" />}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
              {activeConversation.contact?.firstName?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {activeConversation.contact?.firstName || 'Unknown'}
                {activeConversation.contact?.lastName ? ` ${activeConversation.contact.lastName}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                via {activeConversation.channel?.name} · {activeConversation.status}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateStatus('RESOLVED')} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Resolve
              </button>
              <button className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {messages.map((msg: any) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}
              >
                <div className={msg.direction === 'OUTBOUND' ? 'bubble-outbound' : 'bubble-inbound'}>
                  {msg.content && <p className="text-sm">{msg.content}</p>}
                  {msg.mediaUrl && (
                    <div className="mt-2">
                      <Image className="w-4 h-4 inline-block mr-1" />
                      <a href={msg.mediaUrl} target="_blank" rel="noopener" className="text-xs underline">Media</a>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-xs opacity-60">{new Date(msg.sentAt || msg.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.direction === 'OUTBOUND' && (
                      msg.status === 'READ' ? <CheckCheck className="w-3 h-3 opacity-70" />
                        : msg.status === 'DELIVERED' ? <Check className="w-3 h-3 opacity-70" />
                        : <Clock className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {typingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="bubble-inbound">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">{typingUsers[0]} is typing</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-4 bg-card">
            <div className="flex items-end gap-3 bg-muted/50 rounded-2xl border border-border p-2 pl-4 focus-within:border-primary/50 transition-all">
              <textarea
                value={messageInput}
                onChange={e => { setMessageInput(e.target.value); handleTyping(); }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm focus:outline-none resize-none"
                style={{ maxHeight: '150px' }}
              />
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 pl-1">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
            <p className="text-sm text-muted-foreground">Choose from the list to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
