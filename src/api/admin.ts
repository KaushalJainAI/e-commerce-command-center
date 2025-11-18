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

export interface LoginResponse {
  token: string;
  admin: AdminInfo;
}

export const login = (credentials: LoginCredentials) => 
  api.post<LoginResponse>('/admin/login', credentials);

export const getAdminInfo = () => api.get<AdminInfo>('/admin/info');

export const updateAdminInfo = (data: Partial<AdminInfo> & { password?: string }) => 
  api.put<AdminInfo>('/admin/info', data);
