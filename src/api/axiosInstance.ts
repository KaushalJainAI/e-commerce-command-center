import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// IMPORTANT: Remove Content-Type for FormData to let browser set it with boundary
api.interceptors.request.use((config) => {
  // Let browser set Content-Type with boundary for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  // Add token to requests
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
