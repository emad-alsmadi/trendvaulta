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
  author: Creator | string;
  description: string;
  price: number;
  cover: string;
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
  author: string;
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
