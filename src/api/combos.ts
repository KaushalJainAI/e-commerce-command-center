import api from './axiosInstance';

export interface Combo {
  id: string;
  name: string;
  products: string[];
  price: number;
  discount: number;
  status: 'active' | 'inactive';
  deleted?: boolean;
}

export const getCombos = () => api.get<Combo[]>('/combos');
export const getCombo = (id: string) => api.get<Combo>(`/combos/${id}`);
export const createCombo = (data: Omit<Combo, 'id'>) => api.post<Combo>('/combos', data);
export const updateCombo = (id: string, data: Partial<Combo>) => api.put<Combo>(`/combos/${id}`, data);
export const deleteCombo = (id: string) => api.delete(`/combos/${id}`);
export const restoreCombo = (id: string) => api.post(`/combos/${id}/restore`);
