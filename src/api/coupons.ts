import api from './axiosInstance';

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  is_active: boolean;
  valid_until: string | null;
}

export interface CouponFormData {
  code: string;
  discount_percent: number;
  is_active: boolean;
  valid_until: string | null;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Fetch all coupons (handles both paginated and array responses)
export const getCoupons = async () => {
  const response = await api.get<PaginatedResponse<Coupon> | Coupon[]>('/coupons/');
  const data = Array.isArray(response.data)
    ? response.data
    : (response.data as PaginatedResponse<Coupon>).results || [];
  return { data };
};

// Fetch single coupon by ID
export const getCoupon = async (id: number) => {
  const response = await api.get<Coupon>(`/coupons/${id}/`);
  return response.data;
};

// Create new coupon
export const createCoupon = async (data: CouponFormData) => {
  const response = await api.post<Coupon>('/coupons/', data);
  return response.data;
};

// Update existing coupon (partial update) - supports both form data and JSON
export const updateCoupon = async (id: number, data: Partial<CouponFormData> | Record<string, any>) => {
  const response = await api.patch<Coupon>(`/coupons/${id}/`, data);
  return response.data;
};

// Delete coupon
export const deleteCoupon = async (id: number) => {
  await api.delete(`/coupons/${id}/`);
};

// Validate coupon code — admin check that a code exists and is redeemable
// (active, not expired, usage limit not reached).
export interface CouponValidation {
  valid: boolean;
  reason?: string | null;
  coupon?: Coupon;
  error?: string;
}

export const validateCoupon = async (code: string): Promise<CouponValidation> => {
  const response = await api.post<CouponValidation>('/coupons/validate/', { code });
  return response.data;
};
