import api from './axiosInstance';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  description?: string;
  image?: string;
  category?: string;
  deleted?: boolean;
}

export const getProducts = () => api.get<Product[]>('/products');
export const getProduct = (id: string) => api.get<Product>(`/products/${id}`);
export const createProduct = (data: Omit<Product, 'id'>) => api.post<Product>('/products', data);
export const updateProduct = (id: string, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const restoreProduct = (id: string) => api.post(`/products/${id}/restore`);
