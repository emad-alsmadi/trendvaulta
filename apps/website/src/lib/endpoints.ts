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
  addresses: {
    list: '/auth/addresses',
    create: '/auth/addresses',
    update: (addressId: string) => `/auth/addresses/${addressId}`,
    remove: (addressId: string) => `/auth/addresses/${addressId}`,
    setDefault: (addressId: string) => `/auth/addresses/${addressId}/default`,
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
    /** Server-side cart revalidation + totals — POST /api/payments/quote */
    quote: '/payments/quote',
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
  newsletter: {
    subscribe: '/newsletter',
    unsubscribe: '/newsletter/unsubscribe',
  },
  contact: {
    send: '/contact',
  },
} as const;
