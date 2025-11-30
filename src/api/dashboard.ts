import api from './axiosInstance';

export interface DashboardStats {
  totalProducts: number;
  totalCombos: number;
  totalOrders: number;
  activeCoupons: number;
  graphNodesCount: number;
  graphEdgesCount: number;
  recentOrders: Array<{
    id: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

// Base axios instance should already have baseURL = '/api' (or full backend URL).
// This call hits: GET /api/dashboard/stats/
export const getDashboardStats = () =>
  api.get<DashboardStats>('/dashboard/');
