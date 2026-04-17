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

// Handle auth errors and smartly parse backend form validations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/panel/login';
      }

      // Check if there is data on the response and smartly parse it
      const data = error.response.data;
      if (data) {
        if (typeof data === 'string') {
          error.message = data;
        } else if (data.error) {
          error.message = data.error;
        } else if (data.detail) {
          error.message = data.detail;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
          error.message = data.non_field_errors[0];
        } else if (data.message) {
          error.message = data.message;
        } else if (typeof data === 'object') {
          // Fallback: extract the first validation field exception
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstKey = keys[0];
            if (Array.isArray(data[firstKey]) && data[firstKey].length > 0) {
              error.message = `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1).replace(/_/g, ' ')}: ${data[firstKey][0]}`;
            } else if (typeof data[firstKey] === 'string') {
              error.message = data[firstKey];
            }
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
