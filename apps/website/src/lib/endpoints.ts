export const endpoints = {
  products: {
    list: '/products',
    details: (id: string) => `/products/${id}`,
    bundles: (id: string) => `/products/${id}/bundles`,
  },
  brands: {
    list: '/brands',
    details: (id: string) => `/brands/${id}`,
  },
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    profile: '/auth/profile',
  },
  password: {
    forgot: '/password/forgot-password',
    reset: (userId: string, token: string) =>
      `/password/reset-password/${userId}/${token}`,
  },
  orders: {
    create: '/orders',
    my: '/orders/my',
    list: '/orders',
    details: (id: string) => `/orders/${id}`,
    updateStatus: (id: string) => `/orders/${id}/status`,
  },
  payments: {
    setupStatus: '/payments/setup-status',
    checkoutSession: '/payments/checkout-session',
    verifyPayment: '/payments/verify-payment',
  },
  admin: {
    users: {
      list: '/users',
      details: (id: string) => `/users/${id}`,
      update: (id: string) => `/users/${id}`,
      delete: (id: string) => `/users/${id}`,
    },
    coupons: {
      list: '/coupons',
      create: '/coupons',
      update: (id: string) => `/coupons/${id}`,
      delete: (id: string) => `/coupons/${id}`,
    },
    orders: {
      list: '/orders',
      updateStatus: (id: string) => `/orders/${id}/status`,
    },
  },
  wishlist: {
    add: (productId: string) => `/wishlist/${productId}`,
    remove: (productId: string) => `/wishlist/${productId}`,
    my: '/wishlist/my',
    check: (productId: string) => `/wishlist/check/${productId}`,
  },
  reviews: {
    create: '/reviews',
    update: (reviewId: string) => `/reviews/${reviewId}`,
    delete: (reviewId: string) => `/reviews/${reviewId}`,
    product: (productId: string) => `/reviews/product/${productId}`,
    my: (productId: string) => `/reviews/my/${productId}`,
    myReviews: '/reviews/my',
  },
  coupons: {
    byCode: (code: string) => `/coupons/code/${code}`,
    /** Checkout UX — POST /api/coupons/validate */
    validate: '/coupons/validate',
  },
  recentlyViewed: {
    list: '/me/recently-viewed',
    track: '/me/recently-viewed',
  },
  offers: {
    list: '/offers',
  },
  recommendations: {
    list: '/recommendations',
  },
  storefront: {
    home: '/storefront/home',
    trust: '/storefront/trust',
    giftFinder: '/storefront/gift-finder',
    lookbooks: '/storefront/lookbooks',
    categories: '/storefront/categories',
    testimonials: '/storefront/testimonials',
    whyChooseUs: '/storefront/why-choose-us',
  },
} as const;
