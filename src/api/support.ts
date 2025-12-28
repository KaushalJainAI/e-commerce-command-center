import api from './axiosInstance';

// Contact Submission types
export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  user_email?: string;
  admin_notes: string;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

// Chat types
export interface ChatMessage {
  id: number;
  sender_type: 'user' | 'admin' | 'system';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatSession {
  id: number;
  session_id: string;
  user_email?: string;
  guest_name?: string;
  guest_email?: string;
  order_number?: string;
  subject: string;
  status: 'open' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  last_message?: {
    sender_type: string;
    message: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

// Contact Submissions API
export const getContactSubmissions = () => 
  api.get<ContactSubmission[]>('/contact/');

export const getContactSubmission = (id: number) => 
  api.get<ContactSubmission>(`/contact/${id}/`);

export const updateContactSubmission = (id: number, data: Partial<ContactSubmission>) => 
  api.patch<ContactSubmission>(`/contact/${id}/`, data);

export const markContactAsRead = (id: number) => 
  api.post(`/contact/${id}/mark_read/`);

export const replyToContact = (id: number, notes: string) => 
  api.post(`/contact/${id}/reply/`, { notes });

export const deleteContactSubmission = (id: number) => 
  api.delete(`/contact/${id}/`);

// Chat Sessions API
export const getChatSessions = () => 
  api.get<ChatSession[]>('/chat-sessions/');

export const getChatSession = (id: number) => 
  api.get<ChatSessionDetail>(`/chat-sessions/${id}/`);

export const getChatMessages = (sessionId: number) => 
  api.get<ChatMessage[]>(`/chat-sessions/${sessionId}/messages/`);

export const sendChatMessage = (sessionId: number, message: string) => 
  api.post<ChatMessage>(`/chat-sessions/${sessionId}/messages/`, { message });

export const closeChatSession = (sessionId: number) => 
  api.post(`/chat-sessions/${sessionId}/close/`);

export const assignChatSession = (sessionId: number) => 
  api.post(`/chat-sessions/${sessionId}/assign/`);

export const updateChatSession = (id: number, data: Partial<ChatSession>) => 
  api.patch<ChatSession>(`/chat-sessions/${id}/`, data);
