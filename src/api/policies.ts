import api from './axiosInstance';

export interface Policy {
  type: 'shipping' | 'return';
  content: string;
}

// Get policy by type (with trailing slash for Django)
export const getPolicy = (type: 'shipping' | 'return') => 
  api.get<Policy>(`/policies/${type}/`);

// Update policy (with trailing slash for Django)
export const updatePolicy = (type: 'shipping' | 'return', content: string) => 
  api.put<Policy>(`/policies/${type}/`, { content });
