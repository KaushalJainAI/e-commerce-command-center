import api from './axiosInstance';

export type PolicyType = 'shipping' | 'return' | 'privacy';

export interface Policy {
  type: PolicyType;
  content: string;
}

// Get policy by type (with trailing slash for Django)
export const getPolicy = (type: PolicyType) =>
  api.get<Policy>(`/policies/${type}/`);

// Update policy (with trailing slash for Django)
export const updatePolicy = (type: PolicyType, content: string) =>
  api.put<Policy>(`/policies/${type}/`, { content });
