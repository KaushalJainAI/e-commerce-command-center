import api from './axiosInstance';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  fromAdmin: boolean;
  timestamp: string;
  read: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const getChatUsers = () => api.get<ChatUser[]>('/chat/users');
export const getChatMessages = (userId: string) => api.get<ChatMessage[]>(`/chat/messages/${userId}`);
export const sendMessage = (userId: string, message: string) => 
  api.post('/chat/send', { userId, message });
export const markAsRead = (userId: string) => api.post(`/chat/mark-read/${userId}`);
