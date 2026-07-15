export const endpoints = {
  templates: {
    list: '/templates',
    details: (id: string) => `/templates/${id}`,
  },
  creators: {
    list: '/creators',
    details: (id: string) => `/creators/${id}`,
  },
  auth: {
    register: '/auth/register',
    login: '/auth/login',
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
    details: (id: string) => `/orders/${id}`,
  },
  payments: {
    setupStatus: '/payments/setup-status',
    checkoutSession: '/payments/checkout-session',
    verifyPayment: '/payments/verify-payment',
  },
  subscriptions: {
    setupStatus: '/subscriptions/setup-status',
    checkoutSession: '/subscriptions/checkout-session',
    portal: '/subscriptions/portal',
    mine: '/subscriptions/me',
  },
  admin: {
    templates: {
      list: '/templates',
      create: '/templates',
      update: (id: string) => `/templates/${id}`,
      delete: (id: string) => `/templates/${id}`,
    },
    creators: {
      list: '/creators',
      create: '/creators',
      update: (id: string) => `/creators/${id}`,
      delete: (id: string) => `/creators/${id}`,
    },
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
  },
  wishlist: {
    add: (templateId: string) => `/wishlist/${templateId}`,
    remove: (templateId: string) => `/wishlist/${templateId}`,
    my: '/wishlist/my',
    check: (templateId: string) => `/wishlist/check/${templateId}`,
  },
  reviews: {
    create: '/reviews',
    update: (reviewId: string) => `/reviews/${reviewId}`,
    delete: (reviewId: string) => `/reviews/${reviewId}`,
    template: (templateId: string) => `/reviews/template/${templateId}`,
    my: (templateId: string) => `/reviews/my/${templateId}`,
    myReviews: '/reviews/my',
  },
  downloads: {
    create: '/downloads',
    my: '/downloads/my',
    details: (id: string) => `/downloads/${id}`,
    download: (id: string) => `/downloads/${id}/download`,
    delete: (id: string) => `/downloads/${id}`,
  },
  licenses: {
    list: '/licenses',
    details: (slug: string) => `/licenses/${slug}`,
    calculatePrice: '/licenses/calculate-price',
    validate: '/licenses/validate',
    myPurchases: (userId: string) => `/licenses/purchases/${userId}`,
  },
  coupons: {
    byCode: (code: string) => `/coupons/code/${code}`,
    validate: '/coupons/validate',
    incrementUsage: (id: string) => `/coupons/${id}/use`,
  },
} as const;
