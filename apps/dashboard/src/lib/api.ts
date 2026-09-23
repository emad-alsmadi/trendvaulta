import axios from 'axios';
import {
  clearAuthSession,
  getAuthToken,
  getRefreshToken,
  setRefreshedTokens,
} from './auth';
import { viteEnv } from './viteEnv';

/**
 * Dashboard API client — uses Vite proxy `/api` → API server in dev.
 * Override with VITE_API_URL (e.g. http://localhost:3000/api).
 */
const API_BASE = viteEnv.VITE_API_URL?.replace(/\/$/, '') || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 from these endpoints means bad credentials / an invalid refresh
// token, not an expired-but-refreshable access token — never auto-retry them.
const AUTH_BYPASS_PATHS = ['/auth/login', '/auth/refresh'];

function isAuthBypassRequest(config: { url?: string } | undefined) {
  const url = config?.url || '';
  return AUTH_BYPASS_PATHS.some((p) => url.endsWith(p));
}

function forceLogoutRedirect() {
  if (typeof window === 'undefined') return;
  clearAuthSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Share one in-flight refresh call across concurrent 401s — the refresh
// token rotates server-side on every use, so firing it twice in parallel
// would have the second call invalidate the first's brand-new token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        const nextToken: string | null = data?.token || null;
        const nextRefreshToken: string | null = data?.refreshToken || null;
        if (nextToken) {
          setRefreshedTokens({
            token: nextToken,
            refreshToken: nextRefreshToken || undefined,
          });
        }
        return nextToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retriedAfterRefresh &&
      !isAuthBypassRequest(original)
    ) {
      original._retriedAfterRefresh = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      forceLogoutRedirect();
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      forceLogoutRedirect();
    }

    return Promise.reject(error);
  },
);

export type AdminOrderCustomer = {
  _id?: string;
  username?: string;
  email?: string;
};

export type AdminOrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'needs_attention'
  | 'refunded';

export type AdminOrderPaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type AdminOrderAttentionReason =
  | ''
  | 'insufficient_stock'
  | 'paid_after_cancel'
  | 'refund_failed'
  | 'manual_refund_required';

export type AdminOrder = {
  _id: string;
  status: AdminOrderStatus | string;
  paymentStatus?: AdminOrderPaymentStatus | string;
  totalPrice?: number;
  createdAt?: string;
  allowedNextStatuses?: string[];
  user?: string | AdminOrderCustomer;
  attentionReason?: AdminOrderAttentionReason | string;
  refundId?: string;
  refundedAt?: string;
  refundAmount?: number;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  trackingEvents?: Array<{
    status: string;
    description?: string;
    location?: string;
    timestamp?: string;
  }>;
};

export type AdminOrderItem = {
  productId: string;
  title: string;
  price: number;
  qty: number;
  cover?: string;
  variant?: {
    size?: string;
    color?: string;
    colorCode?: string;
    sku?: string;
  };
};

export type AdminOrderShippingAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  notes?: string;
};

export type AdminOrderDetail = AdminOrder & {
  items: AdminOrderItem[];
  shippingAddress: AdminOrderShippingAddress;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  discountAmount: number;
  couponCode?: string;
  stripeSessionId?: string;
  paymentIntentId?: string;
  paidAt?: string;
  updatedAt?: string;
};

export type OrderTrackingPayload = {
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  trackingEvent?: {
    status: string;
    description?: string;
    location?: string;
  };
};

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  q?: string;
};

export type AdminOrdersResponse = {
  data: AdminOrder[];
  meta: { total: number; page: number; pages: number; limit: number };
};

export type LoginResponse = {
  message?: string;
  token: string;
  refreshToken?: string;
  email?: string;
  username?: string;
  roles?: string[];
};

function errorMessage(err: unknown, fallback: string) {
  const ax = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return ax?.response?.data?.message || ax?.message || fallback;
}

export { errorMessage };

export type ProfileUser = {
  _id: string;
  email: string;
  username: string;
  roles?: string[];
  createdAt?: string;
};

export type ProfileResponse = {
  user: ProfileUser;
  permissions?: string[];
};

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const { data } = await api.get<ProfileResponse>('/auth/profile');
    return data;
  },

  updateProfile: async (payload: {
    username: string;
    email: string;
  }): Promise<{ message: string; user: ProfileUser }> => {
    const { data } = await api.put<{ message: string; user: ProfileUser }>(
      '/auth/profile',
      payload,
    );
    return data;
  },

  logout: async (refreshToken?: string) => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Best-effort revoke — clear local session even if the request fails
    }
  },
};

export const adminOrdersApi = {
  getOrders: async (
    params: AdminOrdersQuery = {},
  ): Promise<AdminOrdersResponse> => {
    const { data } = await api.get<AdminOrdersResponse>('/orders', {
      params: { limit: 50, ...params },
    });
    return data;
  },

  updateOrderStatus: async (
    id: string,
    status: string,
  ): Promise<AdminOrder> => {
    const { data } = await api.patch<AdminOrder>(`/orders/${id}/status`, {
      status,
    });
    return data;
  },

  updateOrderTracking: async (
    id: string,
    tracking: OrderTrackingPayload,
  ): Promise<AdminOrder> => {
    const { data } = await api.patch<AdminOrder>(
      `/orders/${id}/tracking`,
      tracking,
    );
    return data;
  },

  getOrderById: async (id: string): Promise<AdminOrderDetail> => {
    const { data } = await api.get<AdminOrderDetail>(`/orders/${id}`);
    return data;
  },
};

export type AdminStatsStatusCounts = {
  pending: number;
  paid: number;
  shipped: number;
  delivered: number;
  canceled: number;
  needs_attention?: number;
  refunded?: number;
};

export type AdminStats = {
  users: number;
  products: number;
  brands: number;
  orders: number;
  paidRevenue: number;
  statusCounts: AdminStatsStatusCounts;
};

export type AdminStatsResponse = {
  message?: string;
  data: AdminStats;
};

export type AdminAnalyticsPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type AdminAnalyticsLeader = {
  title?: string;
  name?: string;
  productId?: string;
  brandId?: string;
  units: number;
  revenue: number;
};

export type AdminAnalytics = {
  days: number;
  series: AdminAnalyticsPoint[];
  topProducts: AdminAnalyticsLeader[];
  topBrands: AdminAnalyticsLeader[];
};

export type LowStockProduct = {
  _id: string;
  title: string;
  slug?: string;
  cover?: string;
  price: number;
  stock: number;
  sku?: string;
  category?: string;
  subcategory?: string;
  brand?: { _id: string; name: string } | null;
};

export const adminStatsApi = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await api.get<AdminStatsResponse>('/admin/stats');
    return data.data;
  },

  getAnalytics: async (days: number): Promise<AdminAnalytics> => {
    const { data } = await api.get<{ data: AdminAnalytics }>('/admin/analytics', {
      params: { days },
    });
    return data.data;
  },

  getLowStock: async (
    threshold?: number,
  ): Promise<{ data: LowStockProduct[]; threshold: number }> => {
    const { data } = await api.get<{ data: LowStockProduct[]; threshold: number }>(
      '/admin/low-stock',
      { params: threshold ? { threshold } : undefined },
    );
    return { data: data.data, threshold: data.threshold };
  },
};

export type AdminBrand = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  isActive?: boolean;
  featured?: boolean;
};

export type BrandFormPayload = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  isActive?: boolean;
  featured?: boolean;
};

export type AdminProduct = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  cover?: string;
  category?: string;
  subcategory?: string;
  stock?: number;
  sku?: string;
  averageRating?: number;
  isActive?: boolean;
  featured?: boolean;
  brand?: string | { _id?: string; name?: string; slug?: string };
};

export type ProductFormPayload = {
  title: string;
  brand: string;
  description: string;
  price: number;
  cover: string;
  category: string;
  subcategory: string;
  stock: number;
  sku?: string;
  isActive?: boolean;
  featured?: boolean;
};

export type PaginatedList<T> = {
  data: T[];
  meta?: { total: number; page: number; pages: number; limit: number };
};

export const adminBrandsApi = {
  getBrands: async (
    params: {
      page?: number;
      limit?: number;
      q?: string;
      includeInactive?: boolean;
    } = {},
  ): Promise<PaginatedList<AdminBrand>> => {
    const { data } = await api.get<PaginatedList<AdminBrand>>('/brands', {
      params: { limit: 50, includeInactive: true, ...params },
    });
    return data;
  },

  createBrand: async (payload: BrandFormPayload): Promise<AdminBrand> => {
    const { data } = await api.post<AdminBrand>('/brands', payload);
    return data;
  },

  updateBrand: async (
    id: string,
    payload: Partial<BrandFormPayload>,
  ): Promise<AdminBrand> => {
    const { data } = await api.put<AdminBrand>(`/brands/${id}`, payload);
    return data;
  },

  deleteBrand: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/brands/${id}`);
    return data;
  },
};

export const adminProductsApi = {
  getProducts: async (
    params: {
      page?: number;
      limit?: number;
      q?: string;
      category?: string;
      brand?: string;
      includeInactive?: boolean;
    } = {},
  ): Promise<PaginatedList<AdminProduct>> => {
    const { data } = await api.get<PaginatedList<AdminProduct>>('/products', {
      params: { limit: 100, includeInactive: true, ...params },
    });
    return data;
  },

  createProduct: async (payload: ProductFormPayload): Promise<AdminProduct> => {
    const { data } = await api.post<AdminProduct>('/products', payload);
    return data;
  },

  updateProduct: async (
    id: string,
    payload: Partial<ProductFormPayload>,
  ): Promise<AdminProduct> => {
    const { data } = await api.put<AdminProduct>(`/products/${id}`, payload);
    return data;
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/products/${id}`);
    return data;
  },
};

export type UploadImageResponse = {
  message?: string;
  data: { url: string };
};

export const uploadsApi = {
  /** Uploads a single product/brand image; returns its public URL. */
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<UploadImageResponse>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.url;
  },
};

export type AppRole = 'user' | 'admin' | 'moderator';

export type AdminUser = {
  _id: string;
  email: string;
  username: string;
  roles?: AppRole[];
  createdAt?: string;
};

export type UserUpdatePayload = {
  email?: string;
  username?: string;
  password?: string;
  roles?: AppRole[];
};

export const adminUsersApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get<AdminUser[]>('/users');
    return Array.isArray(data) ? data : [];
  },

  updateUser: async (
    id: string,
    payload: UserUpdatePayload,
  ): Promise<{ message: string; updatedUser: AdminUser }> => {
    const { data } = await api.put<{ message: string; updatedUser: AdminUser }>(
      `/users/${id}`,
      payload,
    );
    return data;
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/users/${id}`);
    return data;
  },
};

export type DiscountType = 'percentage' | 'fixed';

export type AdminCoupon = {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expirationDate: string;
  usageLimit: number | null;
  usedCount: number;
  minimumOrderAmount: number;
  isActive: boolean;
  description: string | null;
  createdAt?: string;
};

export type CouponPayload = {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expirationDate: string;
  usageLimit?: number | null;
  minimumOrderAmount?: number;
  isActive?: boolean;
  description?: string;
};

export const adminCouponsApi = {
  getCoupons: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedList<AdminCoupon>> => {
    const { data } = await api.get<PaginatedList<AdminCoupon>>('/coupons', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  createCoupon: async (payload: CouponPayload): Promise<AdminCoupon> => {
    const { data } = await api.post<AdminCoupon>('/coupons', payload);
    return data;
  },

  updateCoupon: async (
    id: string,
    payload: Partial<CouponPayload>,
  ): Promise<AdminCoupon> => {
    const { data } = await api.put<AdminCoupon>(`/coupons/${id}`, payload);
    return data;
  },

  deleteCoupon: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/coupons/${id}`);
    return data;
  },
};

export type AdminOffer = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  imageUrl?: string;
  endsAt?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type OfferPayload = {
  title: string;
  href: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  endsAt?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export const adminOffersApi = {
  getOffers: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedList<AdminOffer>> => {
    const { data } = await api.get<PaginatedList<AdminOffer>>('/offers/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  createOffer: async (payload: OfferPayload): Promise<AdminOffer> => {
    const { data } = await api.post<AdminOffer>('/offers', payload);
    return data;
  },

  updateOffer: async (
    id: string,
    payload: Partial<OfferPayload>,
  ): Promise<AdminOffer> => {
    const { data } = await api.put<AdminOffer>(`/offers/${id}`, payload);
    return data;
  },

  deleteOffer: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/offers/${id}`);
    return data;
  },
};

export type AdminReview = {
  _id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  user?: string | { _id?: string; username?: string; email?: string };
  product?:
    | string
    | { _id?: string; title?: string; cover?: string; sku?: string };
};

export const adminReviewsApi = {
  getReviews: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedList<AdminReview>> => {
    const { data } = await api.get<PaginatedList<AdminReview>>(
      '/reviews/admin',
      { params: { limit: 100, ...params } },
    );
    return data;
  },

  deleteReview: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(
      `/reviews/admin/${id}`,
    );
    return data;
  },
};

export type AdminHelpTopic = {
  _id: string;
  id: string;
  title: string;
  description?: string;
  href: string;
  icon?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HelpTopicPayload = {
  id: string;
  title: string;
  href: string;
  description?: string;
  icon?: string;
  active?: boolean;
  sortOrder?: number;
};

export const adminHelpTopicsApi = {
  getHelpTopics: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedList<AdminHelpTopic>> => {
    const { data } = await api.get<PaginatedList<AdminHelpTopic>>(
      '/help-topics/admin',
      { params: { limit: 100, ...params } },
    );
    return data;
  },

  createHelpTopic: async (
    payload: HelpTopicPayload,
  ): Promise<AdminHelpTopic> => {
    const { data } = await api.post<AdminHelpTopic>('/help-topics', payload);
    return data;
  },

  updateHelpTopic: async (
    id: string,
    payload: Partial<HelpTopicPayload>,
  ): Promise<AdminHelpTopic> => {
    const { data } = await api.put<AdminHelpTopic>(
      `/help-topics/${id}`,
      payload,
    );
    return data;
  },

  deleteHelpTopic: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(
      `/help-topics/${id}`,
    );
    return data;
  },
};

export type ContentType =
  | 'SHIPPING'
  | 'RETURNS'
  | 'PRIVACY'
  | 'TERMS'
  | 'STOREFRONT_TRUST';

export type AdminContent = {
  _id: string;
  type: ContentType;
  title: string;
  body: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ContentPayload = {
  type: ContentType;
  title: string;
  body: string;
  active?: boolean;
};

export const adminContentApi = {
  getContent: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedList<AdminContent>> => {
    const { data } = await api.get<PaginatedList<AdminContent>>(
      '/content/admin',
      { params: { limit: 100, ...params } },
    );
    return data;
  },

  createContent: async (payload: ContentPayload): Promise<AdminContent> => {
    const { data } = await api.post<AdminContent>('/content', payload);
    return data;
  },

  updateContent: async (
    id: string,
    payload: Partial<ContentPayload>,
  ): Promise<AdminContent> => {
    const { data } = await api.put<AdminContent>(`/content/${id}`, payload);
    return data;
  },

  deleteContent: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/content/${id}`);
    return data;
  },
};

export type StorefrontModuleType =
  | 'hero_carousel'
  | 'trust_strip'
  | 'featured_brands'
  | 'bestsellers'
  | 'new_arrivals'
  | 'deals_rail'
  | 'lookbooks'
  | 'testimonials'
  | 'categories'
  | 'why_choose_us';

export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  href?: string;
  imageUrl?: string;
  tone?: 'rose' | 'stone' | 'teal' | 'indigo';
  active?: boolean;
  sortOrder?: number;
};

export type TrustItem = {
  icon?: string;
  title: string;
  description: string;
};

export type AdminStorefrontModule = {
  _id: string;
  key: string;
  type: StorefrontModuleType;
  title?: string;
  active: boolean;
  sortOrder: number;
  config?: Record<string, unknown>;
  slides?: HeroSlide[];
  trustItems?: TrustItem[];
  limit?: number;
  items?: unknown[];
  createdAt?: string;
  updatedAt?: string;
};

export type StorefrontModulePayload = {
  key: string;
  type: StorefrontModuleType;
  title?: string;
  active?: boolean;
  sortOrder?: number;
  config?: Record<string, unknown>;
  slides?: HeroSlide[];
  trustItems?: TrustItem[];
  limit?: number;
  items?: unknown[];
};

export const adminStorefrontModulesApi = {
  getStorefrontModules: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{
    data: AdminStorefrontModule[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/storefront-modules/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  getStorefrontModuleById: async (
    id: string,
  ): Promise<{ data: AdminStorefrontModule }> => {
    const { data } = await api.get(`/storefront-modules/${id}`);
    return data;
  },

  createStorefrontModule: async (
    payload: StorefrontModulePayload,
  ): Promise<AdminStorefrontModule> => {
    const { data } = await api.post<AdminStorefrontModule>(
      '/storefront-modules',
      payload,
    );
    return data;
  },

  updateStorefrontModule: async (
    id: string,
    payload: Partial<StorefrontModulePayload>,
  ): Promise<AdminStorefrontModule> => {
    const { data } = await api.put<AdminStorefrontModule>(
      `/storefront-modules/${id}`,
      payload,
    );
    return data;
  },

  deleteStorefrontModule: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(
      `/storefront-modules/${id}`,
    );
    return data;
  },
};

export type LookbookTone = 'rose' | 'stone' | 'teal';

export type AdminLookbook = {
  _id: string;
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref: string;
  imageUrl: string;
  tone: LookbookTone;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LookbookPayload = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref: string;
  imageUrl: string;
  tone?: LookbookTone;
  active?: boolean;
  sortOrder?: number;
};

export const adminLookbooksApi = {
  getLookbooks: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{
    data: AdminLookbook[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/lookbooks/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  getLookbookById: async (id: string): Promise<{ data: AdminLookbook }> => {
    const { data } = await api.get(`/lookbooks/${id}`);
    return data;
  },

  createLookbook: async (payload: LookbookPayload): Promise<AdminLookbook> => {
    const { data } = await api.post<AdminLookbook>('/lookbooks', payload);
    return data;
  },

  updateLookbook: async (
    id: string,
    payload: Partial<LookbookPayload>,
  ): Promise<AdminLookbook> => {
    const { data } = await api.put<AdminLookbook>(`/lookbooks/${id}`, payload);
    return data;
  },

  deleteLookbook: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/lookbooks/${id}`);
    return data;
  },
};

export type AdminTestimonial = {
  _id: string;
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating: number;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TestimonialPayload = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number;
  active?: boolean;
  sortOrder?: number;
};

export const adminTestimonialsApi = {
  getTestimonials: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{
    data: AdminTestimonial[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/testimonials/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  getTestimonialById: async (
    id: string,
  ): Promise<{ data: AdminTestimonial }> => {
    const { data } = await api.get(`/testimonials/${id}`);
    return data;
  },

  createTestimonial: async (
    payload: TestimonialPayload,
  ): Promise<AdminTestimonial> => {
    const { data } = await api.post<AdminTestimonial>('/testimonials', payload);
    return data;
  },

  updateTestimonial: async (
    id: string,
    payload: Partial<TestimonialPayload>,
  ): Promise<AdminTestimonial> => {
    const { data } = await api.put<AdminTestimonial>(
      `/testimonials/${id}`,
      payload,
    );
    return data;
  },

  deleteTestimonial: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(
      `/testimonials/${id}`,
    );
    return data;
  },
};

export type BundleItem = {
  /** Product id; admin list responses populate this into an object. */
  product:
    | string
    | { _id: string; title?: string; price?: number; cover?: string };
  quantity: number;
};

export type BundleItemInput = {
  product: string;
  quantity: number;
};

export type AdminBundle = {
  _id: string;
  primaryProduct: {
    _id: string;
    title: string;
    price: number;
    cover: string;
  };
  items: BundleItem[];
  bundlePrice: number;
  savings: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BundlePayload = {
  primaryProduct: string;
  items: BundleItemInput[];
  bundlePrice: number;
  savings: number;
  active?: boolean;
};

export const adminBundlesApi = {
  getBundles: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{
    data: AdminBundle[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/bundles/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  getBundleById: async (id: string): Promise<{ data: AdminBundle }> => {
    const { data } = await api.get(`/bundles/${id}`);
    return data;
  },

  createBundle: async (payload: BundlePayload): Promise<AdminBundle> => {
    const { data } = await api.post<AdminBundle>('/bundles', payload);
    return data;
  },

  updateBundle: async (
    id: string,
    payload: Partial<BundlePayload>,
  ): Promise<AdminBundle> => {
    const { data } = await api.put<AdminBundle>(`/bundles/${id}`, payload);
    return data;
  },

  deleteBundle: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/bundles/${id}`);
    return data;
  },
};

export type GiftOption = {
  id: string;
  label: string;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type AdminGiftFinderConfig = {
  _id: string;
  occasions: GiftOption[];
  recipients: GiftOption[];
  budgets: GiftOption[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GiftFinderConfigPayload = {
  occasions: GiftOption[];
  recipients: GiftOption[];
  budgets: GiftOption[];
  active?: boolean;
};

export const adminGiftFinderConfigApi = {
  getGiftFinderConfigs: async (): Promise<{
    data: AdminGiftFinderConfig[];
  }> => {
    const { data } = await api.get('/gift-finder/admin');
    return data;
  },

  getGiftFinderConfigById: async (
    id: string,
  ): Promise<{ data: AdminGiftFinderConfig }> => {
    const { data } = await api.get(`/gift-finder/${id}`);
    return data;
  },

  createGiftFinderConfig: async (
    payload: GiftFinderConfigPayload,
  ): Promise<AdminGiftFinderConfig> => {
    const { data } = await api.post<AdminGiftFinderConfig>(
      '/gift-finder',
      payload,
    );
    return data;
  },

  updateGiftFinderConfig: async (
    id: string,
    payload: Partial<GiftFinderConfigPayload>,
  ): Promise<AdminGiftFinderConfig> => {
    const { data } = await api.put<AdminGiftFinderConfig>(
      `/gift-finder/${id}`,
      payload,
    );
    return data;
  },

  deleteGiftFinderConfig: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(
      `/gift-finder/${id}`,
    );
    return data;
  },
};

export type AdminProductQA = {
  _id: string;
  product: {
    _id: string;
    title: string;
  };
  question: string;
  answer?: string;
  askedBy?: {
    _id: string;
    username?: string;
    email?: string;
  };
  answeredBy?: {
    _id: string;
    username?: string;
    email?: string;
  };
  helpful: number;
  notHelpful: number;
  approved: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductQAAnswerPayload = {
  answer?: string;
  approved?: boolean;
};

export const adminProductQAApi = {
  getProductQA: async (
    params: {
      page?: number;
      limit?: number;
      productId?: string;
      approved?: string;
    } = {},
  ): Promise<{
    data: AdminProductQA[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/qa/admin', {
      params: { limit: 100, ...params },
    });
    return data;
  },

  getProductQAById: async (id: string): Promise<{ data: AdminProductQA }> => {
    const { data } = await api.get(`/qa/${id}`);
    return data;
  },

  answerProductQA: async (
    id: string,
    payload: ProductQAAnswerPayload,
  ): Promise<AdminProductQA> => {
    const { data } = await api.put<AdminProductQA>(`/qa/${id}/answer`, payload);
    return data;
  },

  deleteProductQA: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/qa/${id}`);
    return data;
  },
};

export type StoreSettings = {
  storeName: string;
  contactEmail?: string;
  currency: string;
  shipping: {
    standardRateUsd: number;
    expressRateUsd: number;
    freeShippingThresholdUsd: number;
  };
  taxRatePercent: number;
  updatedAt?: string;
  updatedBy?: string | null;
};

export type StoreSettingsPayload = {
  storeName?: string;
  contactEmail?: string;
  currency?: string;
  shipping?: Partial<StoreSettings['shipping']>;
  taxRatePercent?: number;
};

export const adminSettingsApi = {
  getSettings: async (): Promise<{ message: string; data: StoreSettings }> => {
    const { data } = await api.get<{ message: string; data: StoreSettings }>(
      '/admin/settings',
    );
    return data;
  },

  updateSettings: async (
    payload: StoreSettingsPayload,
  ): Promise<{ message: string; data: StoreSettings }> => {
    const { data } = await api.put<{ message: string; data: StoreSettings }>(
      '/admin/settings',
      payload,
    );
    return data;
  },
};
