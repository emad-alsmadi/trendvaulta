import axios from 'axios';
import {
  ProductsQuery,
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
  CouponValidationRequest,
  CouponValidationResponse,
} from '@/types';
import { getAuthToken } from '@/lib/authCookies';
import { endpoints } from './endpoints';

/**
 * Normalizes the API base URL to ensure it ends with /api
 * @param rawBaseUrl - The raw base URL from environment variables
 * @returns Normalized base URL with /api suffix
 */
function normalizeApiBase(rawBaseUrl: string | undefined) {
  if (!rawBaseUrl) return '/api';

  const trimmed = rawBaseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

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
 * Response interceptor to handle 401 unauthorized errors
 * Clears auth cookies and redirects to login page
 */
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

/**
 * Products API - Handles product-related operations
 */
export const productsApi = {
  /**
   * Fetch a paginated list of products with optional filters
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated products response
   */
  getProducts: async (params: ProductsQuery = {}): Promise<any> => {
    const { data } = await api.get('/products', { params });
    return data;
  },
  /**
   * Fetch a single product by ID
   * @param id - Product ID
   * @returns Product details
   */
  getProductById: async (id: string): Promise<any> => {
    const { data } = await api.get(`/products/${id}`);
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
};

/**
 * Order checkout payload type
 */
export type OrderCheckoutPayload = {
  items: {
    productId: string;
    qty: number;
    variant?: { size?: string; color?: string };
  }[];
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
    params: { page?: number; limit?: number } = {},
  ): Promise<any> => {
    const { data } = await api.get('/products', {
      params: { limit: 100, ...params },
    });
    return data;
  },
  /**
   * Create a new product
   * @param payload - Product creation data
   * @returns Created product details
   */
  createProduct: async (payload: any): Promise<any> => {
    const { data } = await api.post('/products', payload);
    return data;
  },
  /**
   * Update an existing product
   * @param id - Product ID
   * @param payload - Partial product update data
   * @returns Updated product details
   */
  updateProduct: async (id: string, payload: any): Promise<any> => {
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
  ): Promise<any> => {
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
  createBrand: async (payload: any): Promise<any> => {
    const { data } = await api.post('/brands', payload);
    return data;
  },
  /**
   * Update an existing brand
   * @param id - Brand ID
   * @param payload - Partial brand update data
   * @returns Updated brand details
   */
  updateBrand: async (id: string, payload: any): Promise<any> => {
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
 * Coupons API - Handles coupon validation and management
 */
export const couponsApi = {
  /**
   * Validate a coupon code for a given order amount
   * @param code - Coupon code
   * @param orderAmount - Order total amount
   * @returns Validation result with discount details
   */
  validateCoupon: async (
    code: string,
    orderAmount: number,
  ): Promise<CouponValidationResponse> => {
    const { data } = await api.post('/coupons/validate', {
      code,
      orderAmount,
    });
    return data;
  },
  /**
   * Get coupon by code
   * @param code - Coupon code
   * @returns Coupon details
   */
  getCouponByCode: async (code: string): Promise<Coupon> => {
    const { data } = await api.get(`/coupons/code/${code}`);
    return data;
  },
  /**
   * Increment coupon usage count
   * @param couponId - Coupon ID
   * @returns Updated coupon
   */
  incrementUsage: async (couponId: string): Promise<Coupon> => {
    const { data } = await api.post(`/coupons/${couponId}/increment`);
    return data;
  },
};
