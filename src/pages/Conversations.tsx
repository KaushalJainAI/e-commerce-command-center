import { useEffect, useRef, useState } from 'react';
import {
  getConversations,
  getConversationMessages,
  adminReply,
  patchConversation,
  ConversationSummary,
  ChatMessage,
} from '@/api/conversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Bot, User, Shield, Send, RefreshCw, MessageSquare, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FilterTab = 'all' | 'needs_human' | 'resolved';

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Conversations = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      const params: { needs_human?: boolean; status?: string } = {};
      if (filter === 'needs_human') params.needs_human = true;
      if (filter === 'resolved') params.status = 'resolved';
      const data = await getConversations(params);
      setConversations(data);
    } catch {
      toast({ title: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const data = await getConversationMessages(convId);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      toast({ title: 'Failed to load messages', variant: 'destructive' });
    }
  };

  // Initial load + poll list every 10s
  useEffect(() => {
    fetchConversations();
    const t = setInterval(fetchConversations, 10000);
    return () => clearInterval(t);
  }, [filter]);

  // Poll messages every 5s when a thread is open
  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.conversation_id);
    const t = setInterval(() => fetchMessages(selected.conversation_id), 5000);
    return () => clearInterval(t);
  }, [selected?.conversation_id]);

  const handleSelect = (conv: ConversationSummary) => {
    setSelected(conv);
    setMessages([]);
    setReplyText('');
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await adminReply(selected.conversation_id, replyText.trim());
      setReplyText('');
      await fetchMessages(selected.conversation_id);
      await fetchConversations();
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try {
      await patchConversation(selected.conversation_id, { status: 'resolved' });
      setSelected((prev) => prev ? { ...prev, status: 'resolved' } : prev);
      await fetchConversations();
      toast({ title: 'Conversation resolved' });
    } catch {
      toast({ title: 'Failed to resolve', variant: 'destructive' });
    }
  };

  const needsHumanCount = conversations.filter((c) => c.needs_human).length;

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'needs_human', label: `Needs Attention${needsHumanCount ? ` (${needsHumanCount})` : ''}` },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left panel: thread list ──────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r flex flex-col bg-card">
        {/* Filter tabs */}
        <div className="flex border-b shrink-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <span className="text-xs text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchConversations}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {loading && (
            <p className="text-center text-muted-foreground text-sm mt-8">Loading…</p>
          )}
          {!loading && conversations.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-8 px-4">
              No conversations.
            </p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => handleSelect(conv)}
              className={cn(
                'w-full text-left px-3 py-3 border-b hover:bg-accent transition-colors',
                selected?.conversation_id === conv.conversation_id && 'bg-accent'
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-sm font-medium truncate flex-1 leading-tight">
                  {conv.title || 'New conversation'}
                </span>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {conv.needs_human && (
                    <span className="h-2 w-2 rounded-full bg-orange-500" title="Needs attention" />
                  )}
                  {conv.status === 'resolved' && (
                    <span className="h-2 w-2 rounded-full bg-green-500" title="Resolved" />
                  )}
                  <span className="text-[10px] text-muted-foreground">{relativeTime(conv.updated_at)}</span>
                </div>
              </div>
              {conv.user_email && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{conv.user_email}</p>
              )}
              {conv.last_message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
              )}
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* ── Right panel: thread detail ───────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p className="text-sm">Select a conversation to view</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Thread header */}
          <div className="px-5 py-3 border-b flex items-center justify-between shrink-0 bg-card">
            <div>
              <p className="font-semibold text-sm">
                {selected.title || 'New conversation'}
              </p>
              <p className="text-xs text-muted-foreground">
                {selected.user_email || 'Guest'} · started {format(new Date(selected.created_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selected.needs_human && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                  Needs attention
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize',
                  selected.status === 'resolved' ? 'border-green-300 text-green-600' : ''
                )}
              >
                {selected.status}
              </Badge>
              {selected.status !== 'resolved' && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleResolve}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolve
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4 max-w-2xl">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isAdmin = msg.role === 'admin';

                return (
                  <div key={msg.id} className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
                    {/* Avatar */}
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                      isUser ? 'bg-primary text-primary-foreground' :
                      isAdmin ? 'bg-orange-500 text-white' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isUser ? <User className="h-4 w-4" /> :
                       isAdmin ? <Shield className="h-4 w-4" /> :
                       <Bot className="h-4 w-4" />}
                    </div>

                    {/* Bubble */}
                    <div className={cn('max-w-[70%] space-y-1', isUser && 'items-end flex flex-col')}>
                      {isAdmin && msg.sender_name && (
                        <p className="text-[11px] text-orange-600 font-medium">
                          {msg.sender_name} — Nidhi Team
                        </p>
                      )}
                      <div className={cn(
                        'px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : isAdmin
                            ? 'bg-orange-50 border border-orange-200 text-foreground rounded-tl-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                      )}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Reply box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="px-5 py-3 border-t flex items-center gap-2 shrink-0 bg-card"
          >
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply as admin…"
              className="flex-1"
              disabled={selected.status === 'resolved'}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!replyText.trim() || sending || selected.status === 'resolved'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Conversations;
