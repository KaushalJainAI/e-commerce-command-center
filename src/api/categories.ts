import api from './axiosInstance';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  created_at?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getCategories = async () => {
  try {
    const response = await api.get<PaginatedResponse<Category>>('/categories');
    return { data: response.data.results || [] };
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return { data: [] };
  }
};

export const getCategory = async (slug: string) => {
  const response = await api.get<Category>(`/categories/${slug}`);
  return { data: response.data };
};
