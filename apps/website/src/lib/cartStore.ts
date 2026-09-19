'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  cover: string;
  qty: number;
  variant?: {
    size?: string;
    color?: string;
    colorCode?: string;
    sku?: string;
  };
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
};

export type AppliedCoupon = {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
};

type CartState = {
  items: CartItem[];
  coupon: AppliedCoupon | null;
};

const SERVER_SNAPSHOT: CartState = { items: [], coupon: null };

const STORAGE_KEY = 'craftify_cart_v1';

const emitter = new EventTarget();

// system deploy and subscribers for create change all tabs web
function emit() {
  emitter.dispatchEvent(new Event('change'));
}

function safeParse(json: string | null): CartState {
  if (!json) return { items: [], coupon: null };
  try {
    const parsed = JSON.parse(json) as CartState;
    if (!parsed || !Array.isArray(parsed.items))
      return { items: [], coupon: null };
    // Migrate old templateId to productId for compatibility
    type LegacyCartItem = Partial<CartItem> & { templateId?: string };
    const items = (parsed.items as unknown as LegacyCartItem[]).map(
      (item) => ({
        ...item,
        productId: item.productId || item.templateId,
      }),
    );
    return {
      items: items
        .filter((x): x is LegacyCartItem & { productId: string } =>
          Boolean(x && typeof x.productId === 'string'),
        )
        .map((x) => ({
          productId: String(x.productId),
          title: String(x.title ?? ''),
          price: Number(x.price ?? 0),
          cover: String(x.cover ?? ''),
          qty: Math.max(1, Number(x.qty ?? 1)),
          variant: x.variant,
          weight: x.weight ? Number(x.weight) : undefined,
          dimensions: x.dimensions,
        })),
      coupon: parsed.coupon || null,
    };
  } catch {
    return { items: [], coupon: null };
  }
}

function readState(): CartState {
  //this function is called on the server and client
  // and important in next js beacase the code load on server SSR & ISR
  if (typeof window === 'undefined') return { items: [], coupon: null };
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

let cachedClientState: CartState = { items: [], coupon: null };
let cacheInitialized = false;

// Get current status of cart
function getClientSnapshot(): CartState {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;
  if (!cacheInitialized) {
    cachedClientState = readState();
    cacheInitialized = true;
  }
  return cachedClientState;
}

// Update current status of cart
function writeState(next: CartState) {
  if (typeof window === 'undefined') return;
  cachedClientState = next;
  cacheInitialized = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

// Subscribe to changes
export function subscribeCart(callback: () => void) {
  const handler = () => callback();
  emitter.addEventListener('change', handler);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cachedClientState = readState();
        cacheInitialized = true;
        callback();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      emitter.removeEventListener('change', handler);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => emitter.removeEventListener('change', handler);
}

export function getCartState(): CartState {
  return getClientSnapshot();
}

export function clearCart() {
  writeState({ items: [], coupon: null });
}

export function removeFromCart(productId: string) {
  const state = readState();
  writeState({
    items: state.items.filter((i) => i.productId !== productId),
    coupon: state.coupon,
  });
}

export function setCartQty(productId: string, qty: number) {
  const q = Math.max(1, Math.floor(qty));
  const state = readState();
  writeState({
    items: state.items.map((i) =>
      i.productId === productId ? { ...i, qty: q } : i,
    ),
    coupon: state.coupon,
  });
}

export function addToCart(item: Omit<CartItem, 'qty'> & { qty?: number }) {
  const state = readState();
  const qty = Math.max(1, Math.floor(item.qty ?? 1));

  // Check if same product with same variant exists
  const existing = state.items.find((i) => {
    if (i.productId !== item.productId) return false;
    if (!item.variant && !i.variant) return true;
    if (!item.variant || !i.variant) return false;
    return (
      item.variant.size === i.variant.size &&
      item.variant.color === i.variant.color
    );
  });

  if (existing) {
    writeState({
      items: state.items.map((i) =>
        i.productId === item.productId &&
        ((!item.variant && !i.variant) ||
          (item.variant?.size === i.variant?.size &&
            item.variant?.color === i.variant?.color))
          ? { ...i, qty: i.qty + qty }
          : i,
      ),
      coupon: state.coupon,
    });
    return;
  }

  writeState({
    items: [
      ...state.items,
      {
        productId: item.productId,
        title: item.title,
        price: item.price,
        cover: item.cover,
        qty,
        variant: item.variant,
        weight: item.weight,
        dimensions: item.dimensions,
      },
    ],
    coupon: state.coupon,
  });
}

export function getCartCount(state: CartState) {
  return state.items.reduce((sum, i) => sum + i.qty, 0);
}

export function getCartSubtotal(state: CartState) {
  return state.items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

export function getCartDiscount(state: CartState) {
  if (!state.coupon) return 0;
  const subtotal = getCartSubtotal(state);
  if (state.coupon.discountType === 'percentage') {
    return (subtotal * state.coupon.discountValue) / 100;
  }
  return Math.min(state.coupon.discountValue, subtotal);
}

export function getCartWeight(state: CartState) {
  return state.items.reduce((sum, i) => {
    const itemWeight = (i.weight || 0) * i.qty;
    return sum + itemWeight;
  }, 0);
}

export function getCartShippingCost(
  state: CartState,
  shippingMethod: 'standard' | 'express' = 'standard',
) {
  const weight = getCartWeight(state);
  const baseRate = shippingMethod === 'express' ? 15 : 5;
  const weightRate = weight > 0 ? Math.ceil(weight / 0.5) * 2 : 0; // $2 per 0.5kg
  return baseRate + weightRate;
}

export function getCartTotal(
  state: CartState,
  shippingMethod: 'standard' | 'express' = 'standard',
) {
  const subtotal = getCartSubtotal(state);
  const discount = getCartDiscount(state);
  const shipping = getCartShippingCost(state, shippingMethod);
  return subtotal - discount + shipping;
}

export function setCartCoupon(coupon: AppliedCoupon | null) {
  const state = readState();
  writeState({ items: state.items, coupon });
}

export function removeCartCoupon() {
  const state = readState();
  writeState({ items: state.items, coupon: null });
}

export function useCart() {
  const state = useSyncExternalStore(
    subscribeCart,
    getCartState,
    () => SERVER_SNAPSHOT,
  );

  // These are stable module-level function references (not component-scoped
  // closures), so they never need to be wrapped in useCallback — doing so
  // added nothing but tripped the react-hooks/use-memo rule.
  const actions = {
    addToCart,
    removeFromCart,
    setCartQty,
    clearCart,
    setCartCoupon,
    removeCartCoupon,
  };

  return {
    state,
    count: getCartCount(state),
    subtotal: getCartSubtotal(state),
    discount: getCartDiscount(state),
    weight: getCartWeight(state),
    getShippingCost: useCallback(
      (method: 'standard' | 'express' = 'standard') =>
        getCartShippingCost(state, method),
      [state],
    ),
    getTotal: useCallback(
      (method: 'standard' | 'express' = 'standard') =>
        getCartTotal(state, method),
      [state],
    ),
    coupon: state.coupon,
    ...actions,
  };
}
