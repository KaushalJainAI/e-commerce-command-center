import api from './axiosInstance';

// Homepage section an admin can place a product/combo into.
export interface ProductSection {
  id: number;
  name: string;
  slug: string;
  section_type: string;
  description?: string;
  icon?: string;
  display_order?: number;
  max_products?: number;
  is_active: boolean;
}

// Flat list of sections for the product/combo edit multi-select.
export const getSections = async () => {
  const response = await api.get<ProductSection[]>('/product-sections/');
  return Array.isArray(response.data) ? response.data : [];
};
