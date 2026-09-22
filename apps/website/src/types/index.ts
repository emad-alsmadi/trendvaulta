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

/**
 * A saved entry in the user's address book (User.addresses[]).
 * Field names mirror ShippingAddress so a saved address maps straight onto
 * the checkout form; `notes` is per-order and is therefore not stored here.
 */
export interface Address {
  _id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

/** Create/update payload for the address book (server fills id + defaults). */
export type AddressPayload = {
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country?: string;
  isDefault?: boolean;
};

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
    sku?: string;
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
  discountAmount?: number;
  couponCode?: string;
  totalPrice: number;
  shippingMethod?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sort presets accepted by GET /api/products. Legacy field strings
 * (`createdAt`, `-price`, …) are still accepted by the API.
 */
export type ProductSort =
  | 'featured'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'bestselling'
  | (string & {});

export interface ProductsQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Brand id(s) — arrays are sent comma-separated */
  brand?: string | string[];
  category?: string;
  subcategory?: string;
  /** Variant size(s), e.g. `M` */
  size?: string | string[];
  /** Variant color(s), matched case-insensitively */
  color?: string | string[];
  /** 0–5 → averageRating >= value */
  minRating?: number;
  /** stock > 0 on the product or any variant */
  inStock?: boolean;
  /** basePrice > price */
  onSale?: boolean;
  featured?: boolean;
  /** Ask the API for `meta.facets` (PLP only — extra aggregation) */
  facets?: boolean;
  page?: number;
  limit?: number;
  sort?: ProductSort;
  /** Staff only — ignored for anonymous catalog requests */
  includeInactive?: boolean | string;
  isActive?: boolean | string;
}

export interface FacetCount {
  value: string;
  count: number;
}

/** Disjunctive facet counts from GET /api/products?facets=true */
export interface ProductFacets {
  brands: Array<{ _id: string; name: string; slug: string; count: number }>;
  sizes: FacetCount[];
  colors: Array<{ value: string; colorCode: string | null; count: number }>;
  categories: FacetCount[];
  subcategories: FacetCount[];
  priceRange: { min: number; max: number };
  /** Products with averageRating >= value (4, 3, 2, 1) */
  ratings: Array<{ value: number; count: number }>;
  inStock: number;
  onSale: number;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    facets?: ProductFacets;
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
    /** Omitted on the public product feed; only owner/admin payloads carry it. */
    email?: string;
  };
  product: string;
  rating: number;
  comment: string;
  verifiedPurchase?: boolean;
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
  images?: string[];
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
  shippingInfo?: string;
  stock: number;
  sku?: string;
  averageRating: number;
  reviewCount: number;
  featured?: boolean;
  /** Merchandising flags from list/detail API (bestseller | new | lowStock) */
  badges?: Array<'bestseller' | 'new' | 'lowStock'>;
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

/** `Address` and `AddressPayload` are declared once near the top of this file. */
export type AddressUpdatePayload = Partial<AddressPayload>;
