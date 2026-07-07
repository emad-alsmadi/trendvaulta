import axios from 'axios';
import {
  TemplatesResponse,
  TemplatesQuery,
  Template,
  Creator,
  CreatorsResponse,
  CreatorsQuery,
  Order,
  SubscriptionRecord,
  AdminUser,
  TemplatePayload,
  CreatorPayload,
  UserUpdatePayload,
} from '@/types';
import { getAuthToken } from '@/lib/authCookies';

function normalizeApiBase(rawBaseUrl: string | undefined) {
  if (!rawBaseUrl) return '/api';

  const trimmed = rawBaseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const API_BASE =
  typeof window === 'undefined'
    ? normalizeApiBase(process.env.NEXT_PUBLIC_API_URL)
    : '/api';

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global error handler for 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any existing auth data
      if (typeof window !== 'undefined') {
        document.cookie =
          'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie =
          'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

        // Show toast message
        const toastEvent = new CustomEvent('showAuthToast', {
          detail: {
            message: 'Please sign in to access this feature.',
            title: 'Authentication Required',
            variant: 'error',
          },
        });
        window.dispatchEvent(toastEvent);

        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 1000);
      }
    }
    return Promise.reject(error);
  },
);

export const templatesApi = {
  getTemplates: async (
    params: TemplatesQuery = {},
  ): Promise<TemplatesResponse> => {
    const { data } = await api.get('/templates', { params });
    return data;
  },
  getTemplateById: async (id: string): Promise<Template> => {
    const { data } = await api.get(`/templates/${id}`);
    return data;
  },
};

export const authorsApi = {
  getAuthors: async (params: CreatorsQuery = {}): Promise<CreatorsResponse> => {
    const { data } = await api.get('/creators', { params });
    return data;
  },
  getAuthorById: async (id: string): Promise<any> => {
    const { data } = await api.get(`/creators/${id}`);
    return data;
  },
};

export const authApi = {
  register: async (payload: {
    email: string;
    username: string;
    password: string;
  }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
  profile: async () => {
    const { data } = await api.get('/auth/profile');
    return data;
  },
  updateProfile: async (payload: { username: string; email: string }) => {
    const { data } = await api.put('/auth/profile', payload);
    return data;
  },
};

export const passwordApi = {
  forgotPassword: async (email: string) => {
    const { data } = await api.post('/password/forgot-password', { email });
    return data;
  },
  resetPassword: async (userId: string, token: string, password: string) => {
    const { data } = await api.post(
      `/password/reset-password/${userId}/${token}`,
      { password },
    );
    return data;
  },
};

export type OrderCheckoutPayload = {
  items: { templateId: string; qty: number }[];
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    notes?: string;
  };
  shippingPrice?: number;
  taxPrice?: number;
};

export const ordersApi = {
  createOrder: async (payload: OrderCheckoutPayload): Promise<Order> => {
    const { data } = await api.post('/orders', payload);
    return data;
  },
  getMyOrders: async (): Promise<Order[]> => {
    const { data } = await api.get('/orders/my');
    return data;
  },
  getOrderById: async (id: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  },
};

export const paymentsApi = {
  getSetupStatus: async (): Promise<{ ready: boolean }> => {
    const { data } = await api.get('/payments/setup-status');
    return data;
  },
  createCheckoutSession: async (
    payload: OrderCheckoutPayload,
  ): Promise<{ url: string; orderId: string; sessionId: string }> => {
    const { data } = await api.post('/payments/checkout-session', payload);
    return data;
  },
};

export type SubscriptionSetupStatus = {
  ready: boolean;
  stripeSecretConfigured: boolean;
  subscriptionPriceConfigured: boolean;
};

export const subscriptionsApi = {
  getSetupStatus: async (): Promise<SubscriptionSetupStatus> => {
    const { data } = await api.get('/subscriptions/setup-status');
    return data;
  },
  createCheckoutSession: async (): Promise<{ url: string }> => {
    const { data } = await api.post('/subscriptions/checkout-session');
    return data;
  },
  createPortalSession: async (): Promise<{ url: string }> => {
    const { data } = await api.post('/subscriptions/portal');
    return data;
  },
  getMine: async (): Promise<SubscriptionRecord | null> => {
    const { data } = await api.get('/subscriptions/me');
    return data;
  },
};

export const adminApi = {
  getTemplates: async (params: TemplatesQuery = {}): Promise<TemplatesResponse> => {
    const { data } = await api.get('/templates', {
      params: { limit: 100, sort: '-createdAt', ...params },
    });
    return data;
  },
  createTemplate: async (payload: TemplatePayload): Promise<Template> => {
    const { data } = await api.post('/templates', payload);
    return data;
  },
  updateTemplate: async (
    id: string,
    payload: Partial<TemplatePayload>,
  ): Promise<Template> => {
    const { data } = await api.put(`/templates/${id}`, payload);
    return data;
  },
  deleteTemplate: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/templates/${id}`);
    return data;
  },
  getCreators: async (params: CreatorsQuery = {}): Promise<CreatorsResponse> => {
    const { data } = await api.get('/creators', {
      params: { limit: 100, ...params },
    });
    return data;
  },
  createCreator: async (payload: CreatorPayload): Promise<Creator> => {
    const { data } = await api.post('/creators', payload);
    return data;
  },
  updateCreator: async (
    id: string,
    payload: Partial<CreatorPayload>,
  ): Promise<Creator> => {
    const { data } = await api.put(`/creators/${id}`, payload);
    return data;
  },
  deleteCreator: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/creators/${id}`);
    return data;
  },
  getUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  getUserById: async (id: string): Promise<AdminUser> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  updateUser: async (
    id: string,
    payload: UserUpdatePayload,
  ): Promise<{ message: string; updatedUser: AdminUser }> => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data;
  },
  deleteUser: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};

export type { TemplatesResponse, TemplatesQuery };
