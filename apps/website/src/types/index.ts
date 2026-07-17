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

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  qty: number;
  cover: string;
  variant?: {
    size?: string;
    color?: string;
    colorCode?: string;
  };
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
  shippingMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  category?: string;
  subcategory?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
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

export type UserUpdatePayload = {
  email?: string;
  username?: string;
  roles?: AppRole[];
  password?: string;
};

export interface WishlistItem {
  _id: string;
  user: string;
  product: Product;
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
  product: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPayload {
  product: string;
  rating: number;
  comment: string;
}

export interface ReviewUpdatePayload {
  rating?: number;
  comment?: string;
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

export interface Product {
  _id: string;
  title: string;
  brand: Brand | string;
  description: string;
  price: number;
  basePrice: number;
  cover: string;
  category: string;
  subcategory?: string;
  material?: string;
  variants?: ProductVariant[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  shippingInfo?: {
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
  };
  stock: number;
  sku?: string;
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  size?: string;
  color?: string;
  colorCode?: string;
  sku?: string;
  stock?: number;
  price?: number;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductPayload = {
  title: string;
  brand: string;
  description: string;
  price: number;
  cover: string;
  category: string;
  subcategory?: string;
  stock: number;
  sku?: string;
  material?: string;
  variants?: ProductVariant[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  featured?: boolean;
};

export type BrandPayload = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
};
