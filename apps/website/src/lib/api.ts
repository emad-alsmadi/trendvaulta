import axios from 'axios';
import {
  ProductsQuery,
  ProductsResponse,
  Product,
  ProductPayload,
  Brand,
  BrandPayload,
  Order,
  AdminUser,
  UserUpdatePayload,
  WishlistItem,
  Review,
  ReviewPayload,
  ReviewUpdatePayload,
  Coupon,
  CouponsResponse,
  CouponPayload,
  CouponValidationResponse,
} from '@/types';
import {
  clearAuthCookies,
  getAuthToken,
  setAccessToken,
} from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import { normalizeApiBase } from '@/lib/serverAuth';
import { endpoints } from './endpoints';

/**
 * Axios instance configured with the appropriate base URL
 * Uses NEXT_PUBLIC_API_URL on server side, /api on client side
 */
const API_BASE =
  typeof window === 'undefined'
    ? normalizeApiBase(process.env.NEXT_PUBLIC_API_URL)
    : '/api';

/**
 * Main axios instance for API calls
 * Automatically includes base URL and authentication headers
 */
export const api = axios.create({
  baseURL: API_BASE,
});

/**
 * Request interceptor to add authentication token to all requests
 * Automatically adds Bearer token from cookies if available
 */
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

/**
 * Endpoints that must never trigger an auto-refresh-and-retry: a 401 from
 * login/register/refresh itself means the credentials/refresh token are
 * bad, not that the access token expired mid-session.
 */
const AUTH_BYPASS_PATHS = [
  endpoints.auth.login,
  endpoints.auth.register,
  endpoints.auth.refresh,
  endpoints.auth.logout,
];

/**
 * Same-origin Next route handlers (src/app/api/auth/*) that front the
 * backend auth endpoints. They own the httpOnly `tv_refresh` cookie, so the
 * browser never holds the refresh token; from the client the `/api` base
 * already resolves `endpoints.auth.*` to these handlers rather than the
 * rewrite to the backend.
 */
const AUTH_PROXY_BASE = '/api';

function isAuthBypassRequest(config: { url?: string } | undefined) {
  const url = config?.url || '';
  return AUTH_BYPASS_PATHS.some((p) => url.endsWith(p));
}

function forceLogoutRedirect() {
  if (typeof window === 'undefined') return;
  clearAuthCookies();

  const toastEvent = new CustomEvent('showAuthToast', {
    detail: {
      message: 'Please sign in to access this feature.',
      title: 'Authentication Required',
      variant: 'error',
    },
  });
  window.dispatchEvent(toastEvent);

  setTimeout(() => {
    const { pathname, search } = window.location;
    window.location.href = buildLoginUrl(`${pathname}${search}`);
  }, 1000);
}

// Concurrent 401s (e.g. several widgets fetching at once right as the access
// token expires) must share a single in-flight refresh call — the refresh
// token is rotated server-side on every use, so firing it twice in parallel
// would have the second call invalidate the first's brand-new token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // The refresh token lives in an httpOnly cookie only the Next handler can
  // read, so this is always a same-origin call with credentials.
  if (typeof window === 'undefined') return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${AUTH_PROXY_BASE}${endpoints.auth.refresh}`, null, {
        withCredentials: true,
      })
      .then(({ data }) => {
        const nextToken: string | null = data?.token || null;
        if (nextToken) setAccessToken(nextToken);
        return nextToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * Response interceptor: on a 401 from an authenticated request, try exactly
 * once to refresh the access token and replay the original request. Only if
 * that fails (refresh token missing/expired/revoked) do we clear cookies and
 * bounce to login — this is what lets a 15-minute access token feel
 * invisible to the user instead of logging them out constantly.
 */
api.interceptors.response.use(
  (response) => response,
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

/**
 * Products API - Handles product-related operations
 */
export const productsApi = {
  /**
   * Fetch a paginated list of products with optional filters
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated products response
   */
  getProducts: async (
    params: ProductsQuery = {},
  ): Promise<ProductsResponse> => {
    const { data } = await api.get('/products', { params });
    return data;
  },
  /**
   * Fetch a single product by ID
   * @param id - Product ID
   * @returns Product details
   */
  getProductById: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
  /**
   * Frequently-bought-together companions for a product
   * @param id - Product ID
   * @returns Bundle companions plus optional display-only pricing
   */
  getProductBundles: async (
    id: string,
  ): Promise<{
    message: string;
    primaryProductId: string;
    items: Product[];
    bundlePrice?: number;
    savings?: number;
  }> => {
    const { data } = await api.get(endpoints.products.bundles(id));
    return data;
  },
};

/**
 * Authentication API - Handles user authentication operations
 */
export const authApi = {
  /**
   * Register a new user account
   * @param payload - User registration data (email, username, password)
   * @returns Registration response with user data and token
   */
  register: async (payload: {
    email: string;
    username: string;
    password: string;
  }) => {
    const { data } = await api.post(endpoints.auth.register, payload);
    return data;
  },
  /**
   * Authenticate user with email and password
   * @param payload - Login credentials (email, password)
   * @returns Login response with user data and token
   */
  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post(endpoints.auth.login, payload);
    return data;
  },
  /**
   * Fetch current user profile
   * @returns User profile data
   */
  profile: async () => {
    const { data } = await api.get(endpoints.auth.profile);
    return data;
  },
  /**
   * Update current user profile
   * @param payload - Profile update data (username, email)
   * @returns Updated user profile
   */
  updateProfile: async (payload: { username: string; email: string }) => {
    const { data } = await api.put(endpoints.auth.profile, payload);
    return data;
  },
  /**
   * Revoke the current session's refresh token server-side via the Next
   * logout handler, which reads and clears the httpOnly cookie. Best-effort:
   * the frontend clears its own cookies regardless of whether this succeeds.
   */
  logout: async () => {
    await api.post(endpoints.auth.logout).catch(() => {});
  },
};

/**
 * Password API - Handles password reset operations
 */
export const passwordApi = {
  /**
   * Request password reset email
   * @param email - User email address
   * @returns Password reset request response
   */
  forgotPassword: async (email: string) => {
    const { data } = await api.post(endpoints.password.forgot, { email });
    return data;
  },
  /**
   * Reset password with token
   * @param userId - User ID
   * @param token - Password reset token from email
   * @param password - New password
   * @returns Password reset response
   */
  resetPassword: async (userId: string, token: string, password: string) => {
    const { data } = await api.post(endpoints.password.reset(userId, token), {
      password,
    });
    return data;
  },
};

/**
 * Orders API - Handles order-related operations
 */
export const ordersApi = {
  /**
   * Create a new order
   * @param payload - Order checkout data with items and shipping address
   * @returns Created order details
   */
  createOrder: async (payload: OrderCheckoutPayload): Promise<Order> => {
    const { data } = await api.post(endpoints.orders.create, payload);
    return data;
  },
  /**
   * Fetch current user's orders
   * @returns Array of user's orders
   */
  getMyOrders: async (): Promise<Order[]> => {
    const { data } = await api.get(endpoints.orders.my);
    return data;
  },
  /**
   * Fetch a single order by ID
   * @param id - Order ID
   * @returns Order details
   */
  getOrderById: async (id: string): Promise<Order> => {
    const { data } = await api.get(endpoints.orders.details(id));
    return data;
  },
};

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  q?: string;
};

export type AdminOrderCustomer = {
  _id?: string;
  username?: string;
  email?: string;
};

export type AdminOrder = Omit<Order, 'user'> & {
  allowedNextStatuses?: string[];
  user?: string | AdminOrderCustomer;
};

/**
 * Payments API - Handles Stripe payment operations
 */
export const paymentsApi = {
  /**
   * Check if Stripe payment setup is configured
   * @returns Setup status with ready flag
   */
  getSetupStatus: async (): Promise<{ ready: boolean }> => {
    const { data } = await api.get(endpoints.payments.setupStatus);
    return data;
  },
  /**
   * Create a Stripe checkout session for order payment
   * @param payload - Order checkout data
   * @returns Checkout session URL, order ID, and session ID
   */
  createCheckoutSession: async (
    payload: OrderCheckoutPayload,
  ): Promise<{ url: string; orderId: string; sessionId: string }> => {
    const { data } = await api.post(
      endpoints.payments.checkoutSession,
      payload,
    );
    return data;
  },
  /**
   * Verify payment status for an order (manual Stripe verification)
   * Used as fallback when webhooks are delayed
   * @param orderId - Order ID to verify payment for
   * @returns Payment status and verification details
   */
  verifyPaymentStatus: async (
    orderId: string,
  ): Promise<{
    paymentStatus: string;
    verified?: boolean;
    alreadyPaid?: boolean;
    sessionStatus?: string;
  }> => {
    const { data } = await api.post(endpoints.payments.verifyPayment, {
      orderId,
    });
    return data;
  },
  /**
   * Revalidate cart lines against live stock/prices and get server totals
   * @param payload - Cart lines + coupon/shipping intent
   * @returns Validated lines, totals and per-line warnings
   */
  getQuote: async (payload: CartQuoteRequest): Promise<CartQuoteResponse> => {
    const { data } = await api.post<CartQuoteResponse>(
      endpoints.payments.quote,
      payload,
    );
    return data;
  },
};

export type OrderLineVariant = {
  size?: string;
  color?: string;
  colorCode?: string;
  sku?: string;
};

export type CartQuoteRequest = {
  items: { productId: string; qty: number; variant?: OrderLineVariant }[];
  couponCode?: string;
  delivery?: boolean;
  shippingMethod?: 'none' | 'standard' | 'express';
};

export type CartQuoteWarningCode =
  | 'insufficient_stock'
  | 'price_changed'
  | 'unavailable'
  | 'variant_required';

export type CartQuoteWarning = {
  productId: string;
  code: CartQuoteWarningCode;
  message?: string;
  available?: number;
};

export type CartQuoteLine = {
  productId: string;
  title: string;
  price: number;
  qty: number;
  available: number;
  variant?: OrderLineVariant | null;
  cover?: string;
};

export type CartQuoteResponse = {
  lines: CartQuoteLine[];
  itemsPrice: number;
  discountAmount: number;
  couponValid?: boolean;
  couponMessage?: string;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  warnings?: CartQuoteWarning[];
};

/**
 * Order checkout payload type
 */
export type OrderCheckoutPayload = {
  items: {
    productId: string;
    qty: number;
    variant?: OrderLineVariant;
  }[];
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    notes?: string;
  };
  /** Physical shipping intent — server sets shippingPrice */
  delivery?: boolean;
  shippingMethod?: 'none' | 'standard' | 'express';
  /** Server re-validates and applies discount */
  couponCode?: string;
};

/**
 * Admin API - Handles administrative operations for products, brands, and users
 */
export const adminApi = {
  /**
   * Fetch all users (admin only)
   * @returns Array of users
   */
  getUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  /**
   * Fetch a single user by ID
   * @param id - User ID
   * @returns User details
   */
  getUserById: async (id: string): Promise<AdminUser> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  /**
   * Update a user
   * @param id - User ID
   * @param payload - User update data
   * @returns Update confirmation with updated user
   */
  updateUser: async (
    id: string,
    payload: UserUpdatePayload,
  ): Promise<{ message: string; updatedUser: AdminUser }> => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data;
  },
  /**
   * Delete a user
   * @param id - User ID
   * @returns Deletion confirmation message
   */
  deleteUser: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
  /**
   * Fetch coupons with admin-level access
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated coupons response
   */
  getCoupons: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<CouponsResponse> => {
    const { data } = await api.get('/coupons', {
      params: { limit: 100, ...params },
    });
    return data;
  },
  /**
   * Create a new coupon
   * @param payload - Coupon creation data
   * @returns Created coupon details
   */
  createCoupon: async (payload: CouponPayload): Promise<Coupon> => {
    const { data } = await api.post('/coupons', payload);
    return data;
  },
  /**
   * Update an existing coupon
   * @param id - Coupon ID
   * @param payload - Partial coupon update data
   * @returns Updated coupon details
   */
  updateCoupon: async (
    id: string,
    payload: Partial<CouponPayload>,
  ): Promise<Coupon> => {
    const { data } = await api.put(`/coupons/${id}`, payload);
    return data;
  },
  /**
   * Delete/deactivate a coupon
   * @param id - Coupon ID
   * @returns Deletion confirmation message
   */
  deleteCoupon: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/coupons/${id}`);
    return data;
  },
  /**
   * Fetch products with admin-level access
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated products response
   */
  getProducts: async (
    params: { page?: number; limit?: number; includeInactive?: boolean } = {},
  ): Promise<ProductsResponse> => {
    const { data } = await api.get('/products', {
      params: { limit: 100, includeInactive: true, ...params },
    });
    return data;
  },
  /**
   * Admin order list (paginated)
   */
  getOrders: async (
    params: AdminOrdersQuery = {},
  ): Promise<{
    data: AdminOrder[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get(endpoints.admin.orders.list, {
      params: { limit: 50, ...params },
    });
    return data;
  },
  /**
   * Update order fulfillment status (allowed transitions only)
   */
  updateOrderStatus: async (
    id: string,
    status: string,
  ): Promise<AdminOrder> => {
    const { data } = await api.patch(endpoints.admin.orders.updateStatus(id), {
      status,
    });
    return data;
  },
  /**
   * Create a new product
   * @param payload - Product creation data
   * @returns Created product details
   */
  createProduct: async (payload: ProductPayload): Promise<Product> => {
    const { data } = await api.post('/products', payload);
    return data;
  },
  /**
   * Update an existing product
   * @param id - Product ID
   * @param payload - Partial product update data
   * @returns Updated product details
   */
  updateProduct: async (
    id: string,
    payload: Partial<ProductPayload>,
  ): Promise<Product> => {
    const { data } = await api.put(`/products/${id}`, payload);
    return data;
  },
  /**
   * Delete a product
   * @param id - Product ID
   * @returns Deletion confirmation message
   */
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
  /**
   * Fetch brands with admin-level access
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated brands response
   */
  getBrands: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{
    data: Brand[];
    meta: { total: number; page: number; pages: number; limit: number };
  }> => {
    const { data } = await api.get('/brands', {
      params: { limit: 100, ...params },
    });
    return data;
  },
  /**
   * Create a new brand
   * @param payload - Brand creation data
   * @returns Created brand details
   */
  createBrand: async (payload: BrandPayload): Promise<Brand> => {
    const { data } = await api.post('/brands', payload);
    return data;
  },
  /**
   * Update an existing brand
   * @param id - Brand ID
   * @param payload - Partial brand update data
   * @returns Updated brand details
   */
  updateBrand: async (
    id: string,
    payload: Partial<BrandPayload>,
  ): Promise<Brand> => {
    const { data } = await api.put(`/brands/${id}`, payload);
    return data;
  },
  /**
   * Delete a brand
   * @param id - Brand ID
   * @returns Deletion confirmation message
   */
  deleteBrand: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/brands/${id}`);
    return data;
  },
};

/**
 * Wishlist API - Handles user wishlist operations
 */
export const wishlistApi = {
  /**
   * Add a product to user's wishlist
   * @param productId - Product ID to add
   * @returns Add to wishlist confirmation message
   */
  addToWishlist: async (productId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/wishlist/${productId}`);
    return data;
  },
  /**
   * Remove a product from user's wishlist
   * @param productId - Product ID to remove
   * @returns Remove from wishlist confirmation message
   */
  removeFromWishlist: async (
    productId: string,
  ): Promise<{ message: string }> => {
    const { data } = await api.delete(`/wishlist/${productId}`);
    return data;
  },
  /**
   * Fetch current user's wishlist
   * @returns Array of wishlist items
   */
  getMyWishlist: async (): Promise<WishlistItem[]> => {
    const { data } = await api.get('/wishlist/my');
    return data;
  },
  /**
   * Check if a product is in user's wishlist
   * @param productId - Product ID to check
   * @returns Wishlist status flag
   */
  checkWishlist: async (
    productId: string,
  ): Promise<{ isWishlisted: boolean }> => {
    const { data } = await api.get(`/wishlist/check/${productId}`);
    return data;
  },
};

/**
 * Reviews API - Handles review and rating operations
 */
export const reviewsApi = {
  /**
   * Create a new review for a product
   * @param payload - Review creation data (rating, comment, product ID)
   * @returns Created review details
   */
  createReview: async (payload: ReviewPayload): Promise<Review> => {
    const { data } = await api.post('/reviews', payload);
    return data;
  },
  /**
   * Update an existing review
   * @param reviewId - Review ID to update
   * @param payload - Review update data (rating, comment)
   * @returns Updated review details
   */
  updateReview: async (
    reviewId: string,
    payload: ReviewUpdatePayload,
  ): Promise<Review> => {
    const { data } = await api.put(`/reviews/${reviewId}`, payload);
    return data;
  },
  /**
   * Delete a review
   * @param reviewId - Review ID to delete
   * @returns Deletion confirmation message
   */
  deleteReview: async (reviewId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/reviews/${reviewId}`);
    return data;
  },
  /**
   * Fetch all reviews for a specific product
   * @param productId - Product ID
   * @returns Array of reviews for the product
   */
  getProductReviews: async (productId: string): Promise<Review[]> => {
    const { data } = await api.get(`/reviews/product/${productId}`);
    return data;
  },
  /**
   * Fetch current user's review for a specific product
   * @param productId - Product ID
   * @returns User's review or null if not reviewed
   */
  getMyReview: async (productId: string): Promise<Review | null> => {
    const { data } = await api.get(`/reviews/my/${productId}`);
    return data;
  },
  /**
   * Fetch all reviews by current user
   * @returns Array of user's reviews
   */
  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await api.get('/reviews/my');
    return data;
  },
};

/**
 * Brands API - Handles brand-related operations
 */
export const brandsApi = {
  /**
   * Get brands (optional filters: featured, limit, page, q, country)
   * API returns `{ data, meta }`; callers should normalize as needed.
   */
  getBrands: async (params?: {
    featured?: boolean;
    limit?: number;
    page?: number;
    q?: string;
    country?: string;
  }): Promise<
    | Brand[]
    | {
        data: Brand[];
        meta?: { total: number; page: number; pages: number; limit: number };
      }
  > => {
    const query: Record<string, string | number> = {};
    if (params?.limit != null) query.limit = params.limit;
    if (params?.page != null) query.page = params.page;
    if (params?.q) query.q = params.q;
    if (params?.country) query.country = params.country;
    if (params?.featured === true) query.featured = 'true';
    if (params?.featured === false) query.featured = 'false';

    const { data } = await api.get('/brands', {
      params: Object.keys(query).length ? query : undefined,
    });
    return data;
  },
  /**
   * Get a single brand by ID
   * @param id - Brand ID
   * @returns Brand details
   */
  getBrandById: async (id: string): Promise<Brand> => {
    const { data } = await api.get(`/brands/${id}`);
    return data;
  },
};

/**
 * Coupons API - Handles coupon validation and management
 */
export const couponsApi = {
  /**
   * Validate a coupon code for a given order amount
   * Canonical: POST /api/coupons/validate — usage increments on paid server-side.
   */
  validateCoupon: async (
    code: string,
    orderAmount: number,
  ): Promise<CouponValidationResponse> => {
    const { data } = await api.post(endpoints.coupons.validate, {
      code,
      orderAmount,
    });
    return data;
  },
  /**
   * Get coupon by code
   * Canonical: GET /api/coupons/code/:code
   */
  getCouponByCode: async (code: string): Promise<Coupon> => {
    const { data } = await api.get(endpoints.coupons.byCode(code));
    return data;
  },
};

/**
 * Recently viewed API — authenticated user history (max 12, newest first).
 */
export const recentlyViewedApi = {
  /**
   * GET /api/me/recently-viewed
   * @returns Product results for the current user
   */
  getRecentlyViewed: async (): Promise<Product[]> => {
    const { data } = await api.get<{ results?: Product[] }>(
      endpoints.recentlyViewed.list,
    );
    return Array.isArray(data?.results) ? data.results : [];
  },
  /**
   * POST /api/me/recently-viewed { productId }
   * @param productId - Product ID that was viewed
   * @returns Updated Product results
   */
  trackRecentlyViewed: async (productId: string): Promise<Product[]> => {
    const { data } = await api.post<{ results?: Product[] }>(
      endpoints.recentlyViewed.track,
      { productId },
    );
    return Array.isArray(data?.results) ? data.results : [];
  },
};

export type StorefrontOffer = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  imageUrl: string;
  endsAt?: string | null;
};

export type OffersResponse = {
  message: string;
  results: StorefrontOffer[];
};

/**
 * Offers API — storefront merchandising deals rail
 */
export const offersApi = {
  /**
   * List offers (public)
   * @param params - active filter and limit
   * @returns Offers list envelope
   */
  getOffers: async (
    params: { active?: boolean; limit?: number } = {},
  ): Promise<OffersResponse> => {
    const { data } = await api.get(endpoints.offers.list, {
      params: {
        ...(params.active != null ? { active: String(params.active) } : {}),
        ...(params.limit != null ? { limit: params.limit } : {}),
      },
    });
    return data;
  },
};

export type RecommendationsQuery = {
  context?: string;
  limit?: number;
  category?: string;
};

export type RecommendationsResponse = {
  message: string;
  results: Product[];
  strategy: string;
};

/**
 * Recommendations API — storefront inspired / similar rails
 */
export const recommendationsApi = {
  /**
   * GET /api/recommendations
   * @param params - context, limit, optional category
   * @returns Envelope with results + strategy
   */
  getRecommendations: async (
    params: RecommendationsQuery = {},
  ): Promise<RecommendationsResponse> => {
    const { data } = await api.get<RecommendationsResponse>(
      endpoints.recommendations.list,
      {
        params: {
          ...(params.context != null ? { context: params.context } : {}),
          ...(params.limit != null ? { limit: params.limit } : {}),
          ...(params.category != null ? { category: params.category } : {}),
        },
      },
    );
    return data;
  },
};

export type GiftFinderOption = {
  id: string;
  label: string;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type GiftFinderResponse = {
  message: string;
  occasions: GiftFinderOption[];
  recipients: GiftFinderOption[];
  budgets: GiftFinderOption[];
};

/**
 * Gift finder API — storefront facet config for PLP query building
 */
export const giftFinderApi = {
  /**
   * GET /api/storefront/gift-finder
   * @returns Facet options envelope
   */
  getConfig: async (): Promise<GiftFinderResponse> => {
    const { data } = await api.get<GiftFinderResponse>(
      endpoints.storefront.giftFinder,
    );
    return data;
  },
};

export type StorefrontTrustIcon = 'truck' | 'refresh' | 'shield' | 'headset';

export type StorefrontTrustItem = {
  id?: string;
  icon: StorefrontTrustIcon;
  title: string;
  description: string;
};

export type StorefrontTrustResponse = {
  message: string;
  items: StorefrontTrustItem[];
};

/**
 * Trust / service strip — GET /api/storefront/trust
 */
export const storefrontTrustApi = {
  getTrust: async (): Promise<StorefrontTrustResponse> => {
    const { data } = await api.get<StorefrontTrustResponse>(
      endpoints.storefront.trust,
    );
    return data;
  },
};

export type StorefrontLookbookStory = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  tone: 'rose' | 'stone' | 'teal';
};

export type LookbooksResponse = {
  message: string;
  results: StorefrontLookbookStory[];
};

/**
 * Lookbooks API — editorial storefront modules
 */
export const lookbooksApi = {
  /**
   * GET /api/storefront/lookbooks
   * @returns Envelope with lookbook story results
   */
  getLookbooks: async (): Promise<LookbooksResponse> => {
    const { data } = await api.get<LookbooksResponse>(
      endpoints.storefront.lookbooks,
    );
    return data;
  },
};

export type StorefrontCategoryItem = {
  id: string;
  label: string;
  href: string;
  imageUrl?: string;
};

export type StorefrontCategoriesResponse = {
  message: string;
  results: StorefrontCategoryItem[];
};

/**
 * Categories API — homepage popular category shortcuts
 */
export const categoriesApi = {
  /**
   * GET /api/storefront/categories
   * @returns Envelope with category shortcut results
   */
  getCategories: async (): Promise<StorefrontCategoriesResponse> => {
    const { data } = await api.get<StorefrontCategoriesResponse>(
      endpoints.storefront.categories,
    );
    return data;
  },
};

export type StorefrontTestimonial = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number;
};

export type TestimonialsResponse = {
  message: string;
  results: StorefrontTestimonial[];
};

export const testimonialsApi = {
  getTestimonials: async (): Promise<TestimonialsResponse> => {
    const { data } = await api.get<TestimonialsResponse>(
      endpoints.storefront.testimonials,
    );
    return data;
  },
};

export type WhyChooseUsItem = {
  id?: string;
  icon?: string;
  title: string;
  description: string;
};

export type WhyChooseUsResponse = {
  message: string;
  items: WhyChooseUsItem[];
};

export const whyChooseUsApi = {
  getWhyChooseUs: async (): Promise<WhyChooseUsResponse> => {
    const { data } = await api.get<WhyChooseUsResponse>(
      endpoints.storefront.whyChooseUs,
    );
    return data;
  },
};

export type ProductQAItem = {
  _id: string;
  question: string;
  answer?: string;
  askedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  answeredBy?: {
    _id: string;
    name: string;
    email: string;
  };
  helpful: number;
  notHelpful: number;
  approved: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductQAResponse = {
  message: string;
  results: ProductQAItem[];
};

export const productQAApi = {
  getProductQA: async (productId: string): Promise<ProductQAResponse> => {
    const { data } = await api.get<ProductQAResponse>(
      `/products/${productId}/qa`,
    );
    return data;
  },

  createQuestion: async (
    productId: string,
    question: string,
  ): Promise<ProductQAItem> => {
    const { data } = await api.post<{ data: ProductQAItem }>(
      `/products/${productId}/qa`,
      { question },
    );
    return data.data;
  },

  markHelpful: async (
    qaId: string,
    helpful: boolean,
  ): Promise<{ helpful: number; notHelpful: number }> => {
    const { data } = await api.post<{
      data: { helpful: number; notHelpful: number };
    }>(`/qa/${qaId}/helpful`, { helpful });
    return data.data;
  },
};

export type HelpTopic = {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon?: string;
  active: boolean;
  sortOrder: number;
};

export type HelpTopicsResponse = {
  message: string;
  topics: HelpTopic[];
};

/**
 * Help topics API — storefront help center
 */
export const helpTopicsApi = {
  /**
   * GET /api/storefront/help
   * @returns Envelope with help topic results
   */
  getHelpTopics: async (params?: {
    active?: boolean;
  }): Promise<HelpTopicsResponse> => {
    const { data } = await api.get<HelpTopicsResponse>('/storefront/help', {
      params: {
        ...(params?.active != null ? { active: String(params.active) } : {}),
      },
    });
    return data;
  },
};

export type ContentType =
  | 'SHIPPING'
  | 'RETURNS'
  | 'PRIVACY'
  | 'TERMS'
  | 'STOREFRONT_TRUST';

export type Content = {
  _id: string;
  type: ContentType;
  title: string;
  body: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ContentResponse = {
  message: string;
  data: Content;
};

/**
 * Content API — storefront policy pages
 */
export const contentApi = {
  /**
   * GET /api/content?type=SHIPPING|RETURNS|...
   * @returns Content by type
   */
  getContent: async (type: ContentType): Promise<ContentResponse> => {
    const { data } = await api.get<ContentResponse>('/content', {
      params: { type },
    });
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

export type StorefrontModule = {
  _id?: string;
  key: string;
  type: StorefrontModuleType;
  title?: string;
  active: boolean;
  sortOrder: number;
  config?: Record<string, unknown>;
  slides?: StorefrontHeroSlide[];
  trustItems?: StorefrontTrustItem[];
  limit?: number;
  items?: unknown[];
};

export type StorefrontModulesResponse = {
  message: string;
  modules: StorefrontModule[];
};

/**
 * Storefront modules API — homepage sections
 */
export const storefrontModulesApi = {
  /**
   * GET /api/storefront/modules
   * @returns Active storefront modules
   */
  getStorefrontModules: async (): Promise<StorefrontModulesResponse> => {
    const { data } = await api.get<StorefrontModulesResponse>(
      '/storefront/modules',
    );
    return data;
  },
};

export type StorefrontHeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  href?: string;
  imageUrl?: string;
  tone?: 'rose' | 'stone' | 'teal' | 'indigo';
};

export type StorefrontHomeModule = {
  key: string;
  type: string;
  active?: boolean;
  sortOrder?: number;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  limit?: number;
  sort?: string;
  slides?: StorefrontHeroSlide[];
  items?: StorefrontTrustItem[];
};

export type StorefrontHomeResponse = {
  message: string;
  modules: StorefrontHomeModule[];
};

/**
 * Homepage CMS/config — GET /api/storefront/home
 */
export const storefrontHomeApi = {
  getHome: async (): Promise<StorefrontHomeResponse> => {
    const { data } = await api.get<StorefrontHomeResponse>(
      endpoints.storefront.home,
    );
    return data;
  },
};
