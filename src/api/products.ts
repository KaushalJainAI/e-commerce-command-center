// src/api/products.ts
import api from './axiosInstance';

export interface ProductImage {
  id: number;
  product: number;
  image: string;
  alt_text: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: number;
  category_name?: string;
  spice_form: string;
  price: string;
  discount_price?: string;
  final_price?: number;
  discount_percentage?: number;
  stock: number;
  in_stock?: boolean;
  weight: string;
  organic?: boolean;
  image?: string;
  is_featured?: boolean;
  is_active?: boolean;
  average_rating?: number;
  created_at?: string;
  badge?: string;
  description?: string;
  ingredients?: string;
  images?: ProductImage[];
  origin_country?: string;
  shelf_life?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getProducts = async () => {
  const response = await api.get<PaginatedResponse<Product> | Product[]>('/products/');
  const data = Array.isArray(response.data)
    ? response.data
    : (response.data as PaginatedResponse<Product>).results || [];
  return { data };
};

export const getProduct = async (slug: string) => {
  const response = await api.get<Product>(`/products/${slug}/`);
  return response.data;
};

export const createProduct = async (data: FormData) => {
  const response = await api.post<Product>('/products/', data);
  return response.data;
};

export const updateProduct = async (slug: string, data: FormData | any) => {
  const response = await api.patch<Product>(`/products/${slug}/`, data);
  return response.data;
};

export const getSpiceForms = async () => {
  const response = await api.get<{ value: string; label: string }[]>('/spice-forms/');
  return response.data;
};

export const createProductImage = async (productId: string | number, image: File, altText: string) => {
  const formData = new FormData();
  formData.append('product', String(productId));
  formData.append('image', image);
  formData.append('alt_text', altText);

  const response = await api.post<ProductImage>('/product-images/', formData);
  return response.data;
};

export const deleteProductImage = async (id: number) => {
  await api.delete(`/product-images/${id}/`);
};