import api from './axiosInstance';

export interface BulkProductRow {
  id: number;
  name: string;
  category_name: string;
  price: string;
  discount_price: string;
  stock: number;
  low_stock_threshold: number;
}

export interface BulkChange {
  id: number;
  price?: string;
  discount_price?: string;
  stock?: number | string;
}

export interface BulkApplyResult {
  applied: number;
  errors: { row: number; id?: number; error: string }[];
}

export interface ImportRow {
  name: string;
  id: number | null;
  changes: Record<string, string>;
  error: string | null;
}

export interface ImportPreview {
  rows: ImportRow[];
  ok_count: number;
  error_count: number;
}

export const getBulkProducts = () =>
  api.get<BulkProductRow[]>('/admin/bulk-products/');

export const applyBulkChanges = (changes: BulkChange[]) =>
  api.post<BulkApplyResult>('/admin/bulk-products/apply/', { changes });

export const importProductsCsv = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ImportPreview>('/admin/bulk-products/import/', form);
};

// File download helpers (blob → browser download). Each carries the auth cookie
// via the shared axios instance.
const downloadBlob = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const objectUrl = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
};

export const exportProductsCsv = () =>
  downloadBlob('/admin/products-export/', 'products.csv');

export const exportCustomersCsv = () =>
  downloadBlob('/admin-customers/export/', 'customers.csv');

// Orders export respects whatever filters are currently applied.
export const exportOrdersCsv = (params: Record<string, string | number> = {}) => {
  const search = new URLSearchParams({ ...params, export: 'csv' } as Record<string, string>).toString();
  return downloadBlob(`/orders/?${search}`, 'orders.csv');
};
