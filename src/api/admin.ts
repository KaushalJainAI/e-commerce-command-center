import api from './axiosInstance';

export interface AdminInfo {
  name: string;
  email: string;
  profileImage?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Match SimpleJWT-style response
export interface LoginResponse {
  access: string;
  refresh: string;
}

// Call your Django JWT endpoint
export const login = (credentials: LoginCredentials) =>
  api.post<LoginResponse>('/auth/login/', credentials);

// These endpoints should be protected; axiosInstance should attach the token
export const getAdminInfo = () => api.get<AdminInfo>('/admin/info');

export const updateAdminInfo = (data: Partial<AdminInfo> & { password?: string }) =>
  api.put<AdminInfo>('/admin/info', data);
