import apiClient from './api';
import type {
  User,
  Product,
  Brand,
  Order,
  Coupon,
  Offer,
  Review,
  AuthResponse,
  PaginatedResponse,
} from '@trendvaulta/types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),

  register: (email: string, password: string, username: string) =>
    apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      username,
    }),

  logout: () => apiClient.post('/auth/logout'),

  forgotPassword: (email: string) =>
    apiClient.post('/password/forgot-password', { email }),

  resetPassword: (userId: string, token: string, newPassword: string) =>
    apiClient.post(`/password/reset-password/${userId}/${token}`, {
      password: newPassword,
    }),

  getProfile: () => apiClient.get<{ user: User }>('/auth/profile'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<{ user: User }>('/auth/profile', data),
};

export const productApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Product>>('/products', { params }),

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),

  create: (data: Partial<Product>) =>
    apiClient.post<Product>('/products', data),

  update: (id: string, data: Partial<Product>) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

export const brandApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Brand>>('/brands', { params }),

  getById: (id: string) => apiClient.get<Brand>(`/brands/${id}`),

  create: (data: Partial<Brand>) => apiClient.post<Brand>('/brands', data),

  update: (id: string, data: Partial<Brand>) =>
    apiClient.put<Brand>(`/brands/${id}`, data),

  delete: (id: string) => apiClient.delete(`/brands/${id}`),
};

export const orderApi = {
  create: (data: unknown) => apiClient.post<Order>('/orders', data),

  getMyOrders: () => apiClient.get<Order[]>('/orders/my'),

  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', { params }),

  getById: (id: string) => apiClient.get<Order>(`/orders/${id}`),

  updateStatus: (id: string, status: string) =>
    apiClient.patch<Order>(`/orders/${id}/status`, { status }),
};

export const couponApi = {
  validate: (data: unknown) => apiClient.post('/coupons/validate', data),

  getByCode: (code: string) => apiClient.get<Coupon>(`/coupons/code/${code}`),

  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Coupon>>('/coupons', { params }),

  getById: (id: string) => apiClient.get<Coupon>(`/coupons/${id}`),

  create: (data: Partial<Coupon>) => apiClient.post<Coupon>('/coupons', data),

  update: (id: string, data: Partial<Coupon>) =>
    apiClient.put<Coupon>(`/coupons/${id}`, data),

  delete: (id: string) => apiClient.delete(`/coupons/${id}`),

  incrementUsage: (id: string) => apiClient.post(`/coupons/${id}/use`),
};

export const offerApi = {
  getPublic: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Offer> | Offer[]>('/offers', { params }),

  getAdmin: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Offer>>('/offers/admin', { params }),

  getById: (id: string) => apiClient.get<Offer>(`/offers/${id}`),

  create: (data: Partial<Offer>) => apiClient.post<Offer>('/offers', data),

  update: (id: string, data: Partial<Offer>) =>
    apiClient.put<Offer>(`/offers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/offers/${id}`),
};

export const reviewApi = {
  getByProduct: (productId: string, params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Review> | Review[]>(
      `/reviews/product/${productId}`,
      { params },
    ),

  getAdmin: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Review>>('/reviews/admin', { params }),

  adminDelete: (reviewId: string) =>
    apiClient.delete(`/reviews/admin/${reviewId}`),

  create: (data: Partial<Review>) => apiClient.post<Review>('/reviews', data),

  update: (reviewId: string, data: Partial<Review>) =>
    apiClient.put<Review>(`/reviews/${reviewId}`, data),

  delete: (reviewId: string) => apiClient.delete(`/reviews/${reviewId}`),

  getMyForProduct: (productId: string) =>
    apiClient.get<Review>(`/reviews/my/${productId}`),

  getMy: () => apiClient.get<Review[]>('/reviews/my'),
};

/** @deprecated use authApi.getProfile / authApi.updateProfile */
export const userApi = {
  getProfile: () => authApi.getProfile(),
  updateProfile: (data: Partial<User>) => authApi.updateProfile(data),
};
