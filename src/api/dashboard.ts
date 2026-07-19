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
  recentOrders: RecentOrder[];
}

// Fetch dashboard statistics
export const getDashboardStats = () =>
  api.get<DashboardStats>('/dashboard/');

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
}

// "Today" action inbox: everything that currently needs the admin's attention.
export interface DashboardActions {
  orders_to_confirm: number;
  orders_to_ship: number;
  low_stock_count: number;
  low_stock_items: LowStockItem[];
  chats_waiting: number;
  stuck_payments: number;
  today_orders: number;
  today_revenue: string;
}

export const getDashboardActions = () =>
  api.get<DashboardActions>('/dashboard/actions/');

// Trigger the daily/weekly store-owner email on demand (preview / delivery test).
export const sendReport = (type: 'daily' | 'weekly') =>
  api.post<{ sent: boolean; type: string }>('/dashboard/send-report/', { type });
