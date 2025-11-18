import api from './axiosInstance';

export type DiscountType = 'percentage' | 'fixed';
export type AppliesTo = 'store' | 'category' | 'products';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  appliesTo: AppliesTo;
  targetIds?: string[]; // product IDs or category IDs
  minPurchase?: number;
  expiryDate?: string;
  active: boolean;
  deleted?: boolean;
}

export const getCoupons = () => api.get<Coupon[]>('/coupons');
export const getCoupon = (id: string) => api.get<Coupon>(`/coupons/${id}`);
export const createCoupon = (data: Omit<Coupon, 'id'>) => api.post<Coupon>('/coupons', data);
export const updateCoupon = (id: string, data: Partial<Coupon>) => api.put<Coupon>(`/coupons/${id}`, data);
export const deleteCoupon = (id: string) => api.delete(`/coupons/${id}`);
export const restoreCoupon = (id: string) => api.post(`/coupons/${id}/restore`);
