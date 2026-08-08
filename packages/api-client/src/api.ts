import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import type { ApiResponse } from '@trendvaulta/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError<ApiResponse<any>>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          Cookies.remove('token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T = any>(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.get<ApiResponse<T>>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.post<ApiResponse<T>>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.put<ApiResponse<T>>(url, data, config);
  }

  public patch<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.patch<ApiResponse<T>>(url, data, config);
  }

  public delete<T = any>(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.delete<ApiResponse<T>>(url, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
