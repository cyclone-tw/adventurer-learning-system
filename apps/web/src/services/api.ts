import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code: string; message: string } }>) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle token expiration
      if (status === 401) {
        localStorage.removeItem('token');
        // Redirect to login if not already there
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }

      // Return structured error
      return Promise.reject({
        code: data?.error?.code || 'UNKNOWN_ERROR',
        message: data?.error?.message || '發生未知錯誤',
        status,
      });
    }

    // Network error
    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: '網路連線失敗，請檢查網路狀態',
      status: 0,
    });
  }
);

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export default api;
