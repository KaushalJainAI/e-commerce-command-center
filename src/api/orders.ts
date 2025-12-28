import api from './axiosInstance';

// Status types matching backend Order model
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'delivering';
export type PaymentMethod = 'COD' | 'ONLINE' | 'stripe' | 'razorpay';

// OrderItem interface matching backend OrderItemListSerializer
export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

// Order interface matching backend OrderListSerializer / OrderDetailSerializer
export interface Order {
  id: number;
  order_number: string;
  customer_name?: string;
  customer_email?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  shipping_address: string;
  phone_number?: string;
  payment_method?: PaymentMethod;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
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

// API functions with correct endpoint paths (trailing slashes for Django)
export const getOrders = (filters?: OrderFilters) => 
  api.get<Order[]>('/orders/', { params: filters });

export const getOrder = (id: number | string) => 
  api.get<Order>(`/orders/${id}/`);

export const updateOrder = (id: number | string, data: Partial<Order>) => 
  api.patch<Order>(`/orders/${id}/`, data);

export const deleteOrder = (id: number | string) => 
  api.delete(`/orders/${id}/`);

export const restoreOrder = (id: number | string) => 
  api.post(`/orders/${id}/restore/`);

// Cancel order action
export const cancelOrder = (id: number | string) =>
  api.post(`/orders/${id}/cancel/`);
