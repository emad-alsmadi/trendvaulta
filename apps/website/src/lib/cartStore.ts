'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type CartItem = {
  templateId: string;
  title: string;
  price: number;
  cover: string;
  qty: number;
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
    // Migrate old templateId to templateId for compatibility
    const items = parsed.items.map((item: any) => ({
      ...item,
      templateId: item.templateId,
    }));
    return {
      items: items
        .filter((x: any) => x && typeof x.templateId === 'string')
        .map((x: any) => ({
          templateId: String(x.templateId),
          title: String(x.title ?? ''),
          price: Number(x.price ?? 0),
          cover: String(x.cover ?? ''),
          qty: Math.max(1, Number(x.qty ?? 1)),
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

export function removeFromCart(templateId: string) {
  const state = readState();
  writeState({
    items: state.items.filter((i) => i.templateId !== templateId),
    coupon: state.coupon,
  });
}

export function setCartQty(templateId: string, qty: number) {
  const q = Math.max(1, Math.floor(qty));
  const state = readState();
  writeState({
    items: state.items.map((i) =>
      i.templateId === templateId ? { ...i, qty: q } : i,
    ),
    coupon: state.coupon,
  });
}

export function addToCart(item: Omit<CartItem, 'qty'> & { qty?: number }) {
  const state = readState();
  const qty = Math.max(1, Math.floor(item.qty ?? 1));

  const existing = state.items.find((i) => i.templateId === item.templateId);
  if (existing) {
    writeState({
      items: state.items.map((i) =>
        i.templateId === item.templateId ? { ...i, qty: i.qty + qty } : i,
      ),
      coupon: state.coupon,
    });
    return;
  }

  writeState({
    items: [
      ...state.items,
      {
        templateId: item.templateId,
        title: item.title,
        price: item.price,
        cover: item.cover,
        qty,
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

  const actions = {
    addToCart: useCallback(addToCart, []),
    removeFromCart: useCallback(removeFromCart, []),
    setCartQty: useCallback(setCartQty, []),
    clearCart: useCallback(clearCart, []),
    setCartCoupon: useCallback(setCartCoupon, []),
    removeCartCoupon: useCallback(removeCartCoupon, []),
  };

  return {
    state,
    count: getCartCount(state),
    subtotal: getCartSubtotal(state),
    discount: getCartDiscount(state),
    coupon: state.coupon,
    ...actions,
  };
}
