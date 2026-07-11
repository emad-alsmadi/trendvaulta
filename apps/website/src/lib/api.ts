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
  WishlistItem,
  Review,
  ReviewPayload,
  ReviewUpdatePayload,
} from '@/types';
import { getAuthToken } from '@/lib/authCookies';
import { endpoints } from '@/lib/endpoints';

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
 * Templates API - Handles template-related operations
 */
export const templatesApi = {
  /**
   * Fetch a paginated list of templates with optional filters
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated templates response
   */
  getTemplates: async (
    params: TemplatesQuery = {},
  ): Promise<TemplatesResponse> => {
    const { data } = await api.get(endpoints.templates.list, { params });
    return data;
  },
  /**
   * Fetch a single template by ID
   * @param id - Template ID
   * @returns Template details
   */
  getTemplateById: async (id: string): Promise<Template> => {
    const { data } = await api.get(endpoints.templates.details(id));
    return data;
  },
};

/**
 * Creators API - Handles creator/author-related operations
 */
export const authorsApi = {
  /**
   * Fetch a paginated list of creators with optional filters
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated creators response
   */
  getAuthors: async (params: CreatorsQuery = {}): Promise<CreatorsResponse> => {
    const { data } = await api.get(endpoints.creators.list, { params });
    return data;
  },
  /**
   * Fetch a single creator by ID
   * @param id - Creator ID
   * @returns Creator details
   */
  getAuthorById: async (id: string): Promise<any> => {
    const { data } = await api.get(endpoints.creators.details(id));
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
 * Order checkout payload type
 */
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
 * Subscription setup status type
 */
export type SubscriptionSetupStatus = {
  ready: boolean;
  stripeSecretConfigured: boolean;
  subscriptionPriceConfigured: boolean;
};

/**
 * Subscriptions API - Handles Stripe subscription operations
 */
export const subscriptionsApi = {
  /**
   * Check if subscription setup is configured
   * @returns Setup status with configuration flags
   */
  getSetupStatus: async (): Promise<SubscriptionSetupStatus> => {
    const { data } = await api.get(endpoints.subscriptions.setupStatus);
    return data;
  },
  /**
   * Create a Stripe checkout session for subscription
   * @returns Checkout session URL
   */
  createCheckoutSession: async (): Promise<{ url: string }> => {
    const { data } = await api.post(endpoints.subscriptions.checkoutSession);
    return data;
  },
  /**
   * Create a Stripe customer portal session for managing subscription
   * @returns Portal session URL
   */
  createPortalSession: async (): Promise<{ url: string }> => {
    const { data } = await api.post(endpoints.subscriptions.portal);
    return data;
  },
  /**
   * Fetch current user's subscription
   * @returns User's subscription record or null if not subscribed
   */
  getMine: async (): Promise<SubscriptionRecord | null> => {
    const { data } = await api.get(endpoints.subscriptions.mine);
    return data;
  },
};

/**
 * Admin API - Handles administrative operations for templates, creators, and users
 */
export const adminApi = {
  /**
   * Fetch templates with admin-level access
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated templates response
   */
  getTemplates: async (
    params: TemplatesQuery = {},
  ): Promise<TemplatesResponse> => {
    const { data } = await api.get(endpoints.admin.templates.list, {
      params: { limit: 100, sort: '-createdAt', ...params },
    });
    return data;
  },
  /**
   * Create a new template
   * @param payload - Template creation data
   * @returns Created template details
   */
  createTemplate: async (payload: TemplatePayload): Promise<Template> => {
    const { data } = await api.post(endpoints.admin.templates.create, payload);
    return data;
  },
  /**
   * Update an existing template
   * @param id - Template ID
   * @param payload - Partial template update data
   * @returns Updated template details
   */
  updateTemplate: async (
    id: string,
    payload: Partial<TemplatePayload>,
  ): Promise<Template> => {
    const { data } = await api.put(
      endpoints.admin.templates.update(id),
      payload,
    );
    return data;
  },
  /**
   * Delete a template
   * @param id - Template ID
   * @returns Deletion confirmation message
   */
  deleteTemplate: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(endpoints.admin.templates.delete(id));
    return data;
  },
  /**
   * Fetch creators with admin-level access
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated creators response
   */
  getCreators: async (
    params: CreatorsQuery = {},
  ): Promise<CreatorsResponse> => {
    const { data } = await api.get(endpoints.admin.creators.list, {
      params: { limit: 100, ...params },
    });
    return data;
  },
  /**
   * Create a new creator
   * @param payload - Creator creation data
   * @returns Created creator details
   */
  createCreator: async (payload: CreatorPayload): Promise<Creator> => {
    const { data } = await api.post(endpoints.admin.creators.create, payload);
    return data;
  },
  /**
   * Update an existing creator
   * @param id - Creator ID
   * @param payload - Partial creator update data
   * @returns Updated creator details
   */
  updateCreator: async (
    id: string,
    payload: Partial<CreatorPayload>,
  ): Promise<Creator> => {
    const { data } = await api.put(
      endpoints.admin.creators.update(id),
      payload,
    );
    return data;
  },
  /**
   * Delete a creator
   * @param id - Creator ID
   * @returns Deletion confirmation message
   */
  deleteCreator: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(endpoints.admin.creators.delete(id));
    return data;
  },
  /**
   * Fetch all users (admin only)
   * @returns Array of users
   */
  getUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get(endpoints.admin.users.list);
    return data;
  },
  /**
   * Fetch a single user by ID
   * @param id - User ID
   * @returns User details
   */
  getUserById: async (id: string): Promise<AdminUser> => {
    const { data } = await api.get(endpoints.admin.users.details(id));
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
    const { data } = await api.put(endpoints.admin.users.update(id), payload);
    return data;
  },
  /**
   * Delete a user
   * @param id - User ID
   * @returns Deletion confirmation message
   */
  deleteUser: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(endpoints.admin.users.delete(id));
    return data;
  },
};

/**
 * Wishlist API - Handles user wishlist operations
 */
export const wishlistApi = {
  /**
   * Add a template to user's wishlist
   * @param templateId - Template ID to add
   * @returns Add to wishlist confirmation message
   */
  addToWishlist: async (templateId: string): Promise<{ message: string }> => {
    const { data } = await api.post(endpoints.wishlist.add(templateId));
    return data;
  },
  /**
   * Remove a template from user's wishlist
   * @param templateId - Template ID to remove
   * @returns Remove from wishlist confirmation message
   */
  removeFromWishlist: async (
    templateId: string,
  ): Promise<{ message: string }> => {
    const { data } = await api.delete(endpoints.wishlist.remove(templateId));
    return data;
  },
  /**
   * Fetch current user's wishlist
   * @returns Array of wishlist items
   */
  getMyWishlist: async (): Promise<WishlistItem[]> => {
    const { data } = await api.get(endpoints.wishlist.my);
    return data;
  },
  /**
   * Check if a template is in user's wishlist
   * @param templateId - Template ID to check
   * @returns Wishlist status flag
   */
  checkWishlist: async (
    templateId: string,
  ): Promise<{ isWishlisted: boolean }> => {
    const { data } = await api.get(endpoints.wishlist.check(templateId));
    return data;
  },
};

/**
 * Reviews API - Handles review and rating operations
 */
export const reviewsApi = {
  /**
   * Create a new review for a template
   * @param payload - Review creation data (rating, comment, template ID)
   * @returns Created review details
   */
  createReview: async (payload: ReviewPayload): Promise<Review> => {
    const { data } = await api.post(endpoints.reviews.create, payload);
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
    const { data } = await api.put(endpoints.reviews.update(reviewId), payload);
    return data;
  },
  /**
   * Delete a review
   * @param reviewId - Review ID to delete
   * @returns Deletion confirmation message
   */
  deleteReview: async (reviewId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(endpoints.reviews.delete(reviewId));
    return data;
  },
  /**
   * Fetch all reviews for a specific template
   * @param templateId - Template ID
   * @returns Array of reviews for the template
   */
  getTemplateReviews: async (templateId: string): Promise<Review[]> => {
    const { data } = await api.get(endpoints.reviews.template(templateId));
    return data;
  },
  /**
   * Fetch current user's review for a specific template
   * @param templateId - Template ID
   * @returns User's review or null if not reviewed
   */
  getMyReview: async (templateId: string): Promise<Review | null> => {
    const { data } = await api.get(endpoints.reviews.my(templateId));
    return data;
  },
  /**
   * Fetch all reviews by current user
   * @returns Array of user's reviews
   */
  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await api.get(endpoints.reviews.myReviews);
    return data;
  },
};

/**
 * Re-export commonly used types for convenience
 */
export type { TemplatesResponse, TemplatesQuery };
