import { useEffect, useState, useRef } from 'react';
import { 
  getChatSessions, 
  getChatMessages, 
  sendChatMessage, 
  closeChatSession,
  ChatSession, 
  ChatMessage 
} from '@/api/support';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, X, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ChatSupport = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
    // Poll every 10 minutes (600000ms) to reduce server load
    const interval = setInterval(fetchSessions, 600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
      // Poll every 10 minutes (600000ms) to reduce server load
      const interval = setInterval(() => fetchMessages(selectedSession.id), 600000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const response = await getChatSessions();
      // Handle both array and paginated response
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      setSessions(data);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const response = await getChatMessages(sessionId);
      // Handle both array and paginated response
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      await sendChatMessage(selectedSession.id, newMessage);
      setNewMessage('');
      await fetchMessages(selectedSession.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession) return;
    
    try {
      await closeChatSession(selectedSession.id);
      toast({ title: 'Success', description: 'Chat session closed' });
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to close session',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      open: { variant: 'default', label: 'Open' },
      waiting: { variant: 'secondary', label: 'Waiting' },
      resolved: { variant: 'outline', label: 'Resolved' },
      closed: { variant: 'outline', label: 'Closed' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return <span className={cn('px-2 py-0.5 text-xs rounded-full', colors[priority])}>{priority}</span>;
  };

  const filteredSessions = sessions.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  );

  const openCount = sessions.filter(s => s.status === 'open').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Support</h1>
          <p className="text-muted-foreground">
            Manage customer conversations
            {openCount > 0 && (
              <Badge variant="destructive" className="ml-2">{openCount} open</Badge>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[350px_1fr]">
        {/* Session List */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                Sessions
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sessions found</p>
                ) : (
                  filteredSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={cn(
                        'w-full rounded-lg p-3 text-left transition-colors hover:bg-accent',
                        selectedSession?.id === session.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">
                          {session.user_email || session.guest_name || 'Guest'}
                        </span>
                        {session.unread_count > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {session.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(session.status)}
                        {getPriorityBadge(session.priority)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{session.subject}</p>
                      {session.order_number && (
                        <p className="text-xs text-primary font-medium">{session.order_number}</p>
                      )}
                      {session.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {session.last_message.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.updated_at), 'dd MMM, hh:mm a')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card>
          {selectedSession ? (
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedSession.user_email || selectedSession.guest_name || 'Guest'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Session: {selectedSession.session_id}
                      </span>
                      {selectedSession.order_number && (
                        <Badge variant="outline">{selectedSession.order_number}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedSession.status)}
                    {selectedSession.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={handleCloseSession}>
                        <X className="h-4 w-4 mr-1" /> Close
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex h-[550px] flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.sender_type === 'admin' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg px-4 py-2',
                            message.sender_type === 'admin'
                              ? 'bg-primary text-primary-foreground'
                              : message.sender_type === 'system'
                              ? 'bg-gray-100 text-gray-600 italic'
                              : 'bg-muted'
                          )}
                        >
                          {message.sender_type !== 'admin' && (
                            <p className="text-xs font-medium mb-1">{message.sender_name}</p>
                          )}
                          <p className="text-sm">{message.message}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {format(new Date(message.created_at), 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {selectedSession.status !== 'closed' && (
                  <form onSubmit={handleSendMessage} className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1"
                        disabled={sending}
                      />
                      <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex h-[600px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <p>Select a conversation to start responding</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatSupport;
