import api from './axiosInstance';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'card' | 'paypal' | 'cod';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  notes?: string;
  createdAt: string;
  deleted?: boolean;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'newest' | 'oldest' | 'highestTotal' | 'lowestTotal';
}

export const getOrders = (filters?: OrderFilters) => api.get<Order[]>('/orders', { params: filters });
export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`);
export const updateOrder = (id: string, data: Partial<Order>) => api.put<Order>(`/orders/${id}`, data);
export const deleteOrder = (id: string) => api.delete(`/orders/${id}`);
export const restoreOrder = (id: string) => api.post(`/orders/${id}/restore`);
