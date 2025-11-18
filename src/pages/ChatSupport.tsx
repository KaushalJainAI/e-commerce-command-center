import { useEffect, useState } from 'react';
import { getChatUsers, getChatMessages, sendMessage, ChatUser, ChatMessage } from '@/api/chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChatSupport = () => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    // Polling for new messages every 3 seconds
    const interval = setInterval(fetchUsers, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      // Poll for new messages for selected user
      const interval = setInterval(() => fetchMessages(selectedUser.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await getChatUsers();
      setUsers(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load chat users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await getChatMessages(userId);
      setMessages(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newMessage.trim()) return;

    try {
      await sendMessage(selectedUser.id, newMessage);
      setNewMessage('');
      fetchMessages(selectedUser.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Support</h1>
        <p className="text-muted-foreground">Manage customer conversations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Active Chats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      'w-full rounded-lg p-3 text-left transition-colors hover:bg-accent',
                      selectedUser?.id === user.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{user.name}</p>
                      {user.unreadCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {user.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.lastMessageTime).toLocaleTimeString()}
                    </p>
                  </button>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground">No active chats</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card>
          {selectedUser ? (
            <>
              <CardHeader>
                <CardTitle>{selectedUser.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-[600px] flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.fromAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg px-4 py-2',
                            message.fromAdmin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="flex h-[600px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatSupport;
