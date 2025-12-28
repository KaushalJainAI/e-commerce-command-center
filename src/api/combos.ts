// src/api/combos.ts
import api from './axiosInstance';

export interface ComboItem {
  id?: number;
  product: number;         // product ID
  product_name?: string;
  product_slug?: string;
  quantity: number;
}

export interface Combo {
  id: number;
  slug: string;
  name: string;
  display_title?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  price: number;
  discount_price?: number;
  final_price?: number;
  discount_percentage?: number;
  total_original_price?: number;
  total_weight?: string;
  image?: string;
  is_featured?: boolean;
  is_active: boolean;
  badge?: string;
  created_at?: string;
  items?: ComboItem[];
  products?: number[];  // Product IDs in combo
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getCombos = async () => {
  const response = await api.get<PaginatedResponse<Combo> | Combo[]>('/combos/');
  const data = Array.isArray(response.data)
    ? response.data
    : (response.data as PaginatedResponse<Combo>).results || [];
  return { data };
};

export const getCombo = async (slugOrId: string | number) => {
  const response = await api.get<Combo>(`/combos/${slugOrId}/`);
  return response.data;
};

export const createCombo = async (formData: FormData) => {
  const response = await api.post<Combo>('/combos/', formData);
  return response.data;
};

export const updateCombo = async (slugOrId: string | number, data: FormData | Partial<Combo>) => {
  const isFormData = data instanceof FormData;
  const response = await api.patch<Combo>(`/combos/${slugOrId}/`, data, {
    headers: isFormData 
      ? {} // Let axios set Content-Type with boundary for FormData
      : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const deleteCombo = async (slugOrId: string | number) => {
  await api.delete(`/combos/${slugOrId}/`);
};