// src/api/combos.ts
import api from './axiosInstance';

export interface ComboItem {
  product: string;        // slug of the product
  product_name: string;
  quantity: number;
}

export interface Combo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: string;
  discount_price?: string;
  image?: string;
  is_featured?: boolean;
  is_active: boolean;
  created_at?: string;
  items: ComboItem[];
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

export const getCombo = async (slug: string) => {
  const response = await api.get<Combo>(`/combos/${slug}/`);
  return response.data;
};

// Critical Fix: Proper FormData handling
export const createCombo = async (formData: FormData) => {
  const response = await api.post<Combo>('/combos/', formData, {
    headers: {
      // DO NOT set Content-Type — let axios add boundary
    },
  });
  return response.data;
};

// Critical Fix: Use PUT for full replacement with FormData
// In @/api/combos.ts
export const updateCombo = async (slug: string, data: FormData | Record<string, any>) => {
  const isFormData = data instanceof FormData;
  
  const response = await api.patch(`/combos/${slug}/`, data, {
    headers: isFormData 
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' },
  });
  
  return response.data;
};


export const deleteCombo = async (slug: string) => {
  await api.delete(`/combos/${slug}/`);
};