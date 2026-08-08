// Shared TrendVaulta domain types (product / brand commerce)

export type AppRole = 'user' | 'admin' | 'moderator';

export interface User {
  _id: string;
  id?: string;
  email: string;
  username: string;
  roles: AppRole[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  size?: string;
  color?: string;
  colorCode?: string;
  sku?: string;
  stock?: number;
  price?: number;
}

export type ProductBadge = 'bestseller' | 'new' | 'lowStock';

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  isActive?: boolean;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  title: string;
  brand: Brand | string;
  description: string;
  price: number;
  basePrice?: number;
  cover: string;
  images?: string[];
  category: string;
  subcategory?: string;
  material?: string;
  variants?: ProductVariant[];
  stock: number;
  sku?: string;
  averageRating?: number;
  reviewCount?: number;
  salesCount?: number;
  isActive?: boolean;
  featured?: boolean;
  badges?: ProductBadge[];
  createdAt?: string;
  updatedAt?: string;
}

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
  variant?: ProductVariant;
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

export interface Order {
  _id: string;
  user: string | User;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  discountAmount?: number;
  couponCode?: string;
  totalPrice: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  user: string | Pick<User, '_id' | 'username' | 'email'>;
  product: string;
  rating: number;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WishlistItem {
  _id: string;
  user: string;
  product: Product | string;
  createdAt?: string;
  updatedAt?: string;
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
  description?: string | null;
}

/** Merchandising / deals rail offer */
export interface Offer {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  imageUrl?: string;
  endsAt?: string | null;
  active?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

/** Common API envelope used by @trendvaulta/api-client */
export interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
  errors?: unknown;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: unknown;
}

export interface AuthResponse extends User {
  token: string;
  message?: string;
}

/** @deprecated Craftify legacy — use Product */
export type Template = Product;
/** @deprecated Craftify legacy — unused; prefer Brand */
export interface Creator {
  _id: string;
  name: string;
  username: string;
}
