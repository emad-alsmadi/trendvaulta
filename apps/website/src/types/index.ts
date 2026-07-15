export interface Creator {
  _id: string;
  name: string;
  country: string;
  bio: string;
  roles: string[];
}

export interface Template {
  _id: string;
  title: string;
  creator: Creator | string;
  description: string;
  price: number;
  cover: string;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResponse {
  data: Template[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface CreatorsResponse {
  data: Creator[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface CreatorsQuery {
  page?: number;
  limit?: number;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface SubscriptionRecord {
  _id: string;
  user: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  templateId: string;
  title: string;
  price: number;
  qty: number;
  cover: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  notes?: string;
}

export interface Order {
  _id: string;
  user: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  stripeSessionId?: string;
  paymentIntentId?: string;
  paidAt?: string;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  creator?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export type AppRole = 'user' | 'admin' | 'moderator';

export interface AdminUser {
  _id: string;
  email: string;
  username: string;
  roles: AppRole[];
  createdAt?: string;
  updatedAt?: string;
}

export type TemplatePayload = {
  title: string;
  creator: string;
  description: string;
  price: number;
  cover: string;
};

export type CreatorPayload = {
  name: string;
  country: string;
  bio: string;
  roles: AppRole[];
};

export type UserUpdatePayload = {
  email?: string;
  username?: string;
  roles?: AppRole[];
  password?: string;
};

export interface WishlistItem {
  _id: string;
  user: string;
  template: Template;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  user: {
    _id: string;
    username: string;
    email: string;
  };
  template: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPayload {
  template: string;
  rating: number;
  comment: string;
}

export interface ReviewUpdatePayload {
  rating?: number;
  comment?: string;
}

export interface Download {
  _id: string;
  user: string;
  template: Template;
  order: Order;
  downloadCount: number;
  lastDownloadDate?: string;
  downloadLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadPayload {
  templateId: string;
  orderId: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
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
  createdAt: string;
  updatedAt: string;
}

export interface CouponsResponse {
  data: Coupon[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface CouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expirationDate: string;
  usageLimit?: number | null;
  minimumOrderAmount?: number;
  isActive?: boolean;
  description?: string;
}

export interface CouponValidationRequest {
  code: string;
  orderAmount: number;
}

export interface CouponValidationResponse {
  valid: boolean;
  message?: string;
  coupon?: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    expirationDate: string;
  };
}
