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
  /** Available stock snapshot at add time (product or variant stock). */
  maxQty?: number;
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

const STORAGE_KEY = 'trendvaulta_cart_v1';
/** Pre-rebrand key: migrated once on first read, then removed. */
const LEGACY_STORAGE_KEY = 'craftify_cart_v1';

const emitter = new EventTarget();

/**
 * Stable identity for a cart line: productId + size + colour (+ sku).
 * Two variants of the same product are different lines.
 */
export function getCartLineKey(
  item: Pick<CartItem, 'productId' | 'variant'>,
): string {
  const v = item.variant;
  const base = `${item.productId}|${v?.size ?? ''}|${v?.color ?? ''}`;
  return v?.sku ? `${base}|${v.sku}` : base;
}

/** Human label for a variant, e.g. "Size: M · Color: Black". Empty when none. */
/**
 * "Size: M · Color: Red". Pass the translator from useTranslation() to get
 * it in the reader's language; without one it stays English (for callers
 * outside React, and pages not translated yet).
 */
export function formatVariantLabel(
  variant?: CartItem['variant'] | null,
  t?: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!variant) return '';
  return [
    variant.size
      ? t ? t('product.sizeValue', { value: variant.size }) : `Size: ${variant.size}`
      : '',
    variant.color
      ? t ? t('product.colorValue', { value: variant.color }) : `Color: ${variant.color}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Floor to an integer >= 1 and cap at maxQty when a stock snapshot exists. */
function clampQty(qty: number, maxQty?: number): number {
  let q = Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1));
  if (typeof maxQty === 'number' && maxQty >= 1) q = Math.min(q, maxQty);
  return q;
}

/** Match a line by its line key; a bare productId matches its no-variant line. */
function lineMatches(item: CartItem, lineKey: string): boolean {
  return (
    getCartLineKey(item) === lineKey ||
    (!item.variant && item.productId === lineKey)
  );
}

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
          qty: clampQty(Number(x.qty ?? 1), x.maxQty),
          variant: x.variant,
          maxQty:
            typeof x.maxQty === 'number' && Number.isFinite(x.maxQty)
              ? x.maxQty
              : undefined,
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
  let raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy != null) {
      raw = legacy;
      try {
        window.localStorage.setItem(STORAGE_KEY, legacy);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Storage may be unavailable (private mode); fall through with `raw`.
      }
    }
  }
  return safeParse(raw);
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

export function removeFromCart(lineKey: string) {
  const state = readState();
  writeState({
    items: state.items.filter((i) => !lineMatches(i, lineKey)),
    coupon: state.coupon,
  });
}

export function setCartQty(lineKey: string, qty: number) {
  const state = readState();
  writeState({
    items: state.items.map((i) =>
      lineMatches(i, lineKey) ? { ...i, qty: clampQty(qty, i.maxQty) } : i,
    ),
    coupon: state.coupon,
  });
}

/** Sync a line with server-validated price/stock (cart quote revalidation). */
export function syncCartLine(
  lineKey: string,
  patch: { price?: number; maxQty?: number },
) {
  const state = readState();
  writeState({
    items: state.items.map((i) => {
      if (!lineMatches(i, lineKey)) return i;
      const next: CartItem = { ...i };
      if (typeof patch.price === 'number' && Number.isFinite(patch.price)) {
        next.price = patch.price;
      }
      if (typeof patch.maxQty === 'number' && Number.isFinite(patch.maxQty)) {
        next.maxQty = patch.maxQty;
      }
      next.qty = clampQty(next.qty, next.maxQty);
      return next;
    }),
    coupon: state.coupon,
  });
}

export function addToCart(item: Omit<CartItem, 'qty'> & { qty?: number }) {
  const state = readState();
  const lineKey = getCartLineKey(item);
  const existing = state.items.find((i) => getCartLineKey(i) === lineKey);

  if (existing) {
    writeState({
      items: state.items.map((i) => {
        if (getCartLineKey(i) !== lineKey) return i;
        const maxQty = item.maxQty ?? i.maxQty;
        return {
          ...i,
          price: item.price,
          maxQty,
          qty: clampQty(i.qty + Math.max(1, Math.floor(item.qty ?? 1)), maxQty),
        };
      }),
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
        qty: clampQty(item.qty ?? 1, item.maxQty),
        variant: item.variant,
        maxQty: item.maxQty,
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
    syncCartLine,
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
