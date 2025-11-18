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

export const getDashboardStats = () => api.get<DashboardStats>('/dashboard/stats');
