import api from './axiosInstance';

export interface Policy {
  type: 'shipping' | 'return';
  content: string;
}

export const getPolicy = (type: 'shipping' | 'return') => api.get<Policy>(`/policies/${type}`);
export const updatePolicy = (type: 'shipping' | 'return', content: string) => 
  api.put(`/policies/${type}`, { content });
