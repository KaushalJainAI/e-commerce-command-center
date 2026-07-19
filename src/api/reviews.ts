import api from './axiosInstance';

export interface Review {
  id: number;
  item_type: 'product' | 'combo';
  product: number | null;
  combo: number | null;
  user: number;
  user_name: string;
  item_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface PaginatedReviews {
  count: number;
  next: string | null;
  previous: string | null;
  results: Review[];
}

// Staff moderation list: every review across all products (?all=true).
export const getAllReviews = (page = 1) =>
  api.get<PaginatedReviews | Review[]>('/reviews/', { params: { all: 'true', page } });

export const setReviewHidden = (id: number, hidden: boolean) =>
  api.post<{ id: number; is_hidden: boolean }>(`/reviews/${id}/set-hidden/`, { hidden });

export const deleteReview = (id: number) => api.delete(`/reviews/${id}/`);
