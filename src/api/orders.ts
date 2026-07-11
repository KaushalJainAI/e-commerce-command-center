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
  tracking_number?: string;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'newest' | 'oldest' | 'highestTotal' | 'lowestTotal';
  search?: string;
}

// DRF PageNumberPagination envelope. The order list is paginated server-side
// (PAGE_SIZE=12), so filters/sort MUST be pushed to the backend — filtering the
// current page in the browser would silently ignore every other page.
export interface PaginatedOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

// API functions with correct endpoint paths (trailing slashes for Django).
// Filters map to the server-side query params handled by OrderViewSet.
export const getOrders = (filters?: OrderFilters, page = 1) => {
  const params: Record<string, string | number> = { page };
  if (filters?.status) params.status = filters.status;
  if (filters?.paymentMethod) params.payment_method = filters.paymentMethod;
  if (filters?.minAmount != null) params.min_amount = filters.minAmount;
  if (filters?.maxAmount != null) params.max_amount = filters.maxAmount;
  if (filters?.sortBy) params.ordering = filters.sortBy;
  if (filters?.search?.trim()) params.search = filters.search.trim();
  return api.get<PaginatedOrders | Order[]>('/orders/', { params });
};

// Recycle Bin: soft-deleted orders only (?deleted=true). The staff order list is
// paginated (PAGE_SIZE=12), so we walk every page and return the FULL flat
// Order[] — the recycle bin has no pagination UI and must show all trashed
// orders, not just the first page. Still handles a bare-array response.
export const getDeletedOrders = async (): Promise<Order[]> => {
  const all: Order[] = [];
  let page = 1;
  // Bounded safety cap so a pathological response can't loop forever.
  for (let guard = 0; guard < 1000; guard++) {
    const response = await api.get<PaginatedOrders | Order[]>('/orders/', {
      params: { deleted: 'true', page },
    });
    if (Array.isArray(response.data)) return response.data;
    const data = response.data as PaginatedOrders;
    all.push(...(data.results || []));
    if (!data.next) break;
    page += 1;
  }
  return all;
};

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
