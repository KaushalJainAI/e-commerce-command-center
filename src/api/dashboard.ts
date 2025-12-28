import api from './axiosInstance';

export interface RecentOrder {
  id: number;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCombos: number;
  totalOrders: number;
  activeCoupons: number;
  graphNodesCount: number;
  graphEdgesCount: number;  // Note: backend returns graphEdgeCount (no 's')
  recentOrders: RecentOrder[];
}

// Fetch dashboard statistics
export const getDashboardStats = () =>
  api.get<DashboardStats>('/dashboard/');
