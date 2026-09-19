import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToCart,
  clearCart,
  getCartCount,
  getCartDiscount,
  getCartShippingCost,
  getCartState,
  getCartSubtotal,
  getCartTotal,
  getCartWeight,
  removeCartCoupon,
  removeFromCart,
  setCartCoupon,
  setCartQty,
} from './cartStore';

// cartStore is localStorage-backed; each test starts from a clean cart.
beforeEach(() => {
  window.localStorage.clear();
  clearCart();
});

describe('addToCart', () => {
  it('adds a new item with a floored, minimum-1 quantity', () => {
    addToCart({ productId: 'p1', title: 'Serum', price: 20, cover: '/a.jpg', qty: 2.9 });
    const state = getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].qty).toBe(2);
  });

  it('defaults qty to 1 when omitted', () => {
    addToCart({ productId: 'p1', title: 'Serum', price: 20, cover: '/a.jpg' });
    expect(getCartState().items[0].qty).toBe(1);
  });

  it('clamps a non-positive qty up to 1', () => {
    addToCart({ productId: 'p1', title: 'Serum', price: 20, cover: '/a.jpg', qty: 0 });
    expect(getCartState().items[0].qty).toBe(1);
  });

  it('merges quantities for the same product + identical variant', () => {
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 1, variant: { size: 'M', color: 'Red' } });
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 2, variant: { size: 'M', color: 'Red' } });
    const state = getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].qty).toBe(3);
  });

  it('keeps different variants of the same product as separate lines', () => {
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 1, variant: { size: 'M', color: 'Red' } });
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 1, variant: { size: 'L', color: 'Red' } });
    expect(getCartState().items).toHaveLength(2);
  });

  it('treats a variant item and a no-variant item on the same product as separate lines', () => {
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 1 });
    addToCart({ productId: 'p1', title: 'Lip', price: 10, cover: '/a.jpg', qty: 1, variant: { size: 'M' } });
    expect(getCartState().items).toHaveLength(2);
  });
});

describe('setCartQty / removeFromCart', () => {
  it('floors and clamps an updated quantity to at least 1', () => {
    addToCart({ productId: 'p1', title: 'Serum', price: 20, cover: '/a.jpg', qty: 1 });
    setCartQty('p1', 5.7);
    expect(getCartState().items[0].qty).toBe(5);
    setCartQty('p1', -3);
    expect(getCartState().items[0].qty).toBe(1);
  });

  it('removes only the targeted product', () => {
    addToCart({ productId: 'p1', title: 'A', price: 10, cover: '/a.jpg' });
    addToCart({ productId: 'p2', title: 'B', price: 10, cover: '/b.jpg' });
    removeFromCart('p1');
    const state = getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe('p2');
  });
});

describe('cart totals', () => {
  it('computes count and subtotal from quantity × price across lines', () => {
    addToCart({ productId: 'p1', title: 'A', price: 20, cover: '/a.jpg', qty: 2 });
    addToCart({ productId: 'p2', title: 'B', price: 15, cover: '/b.jpg', qty: 1 });
    const state = getCartState();
    expect(getCartCount(state)).toBe(3);
    expect(getCartSubtotal(state)).toBe(55); // 20*2 + 15*1
  });

  it('applies a percentage coupon against the subtotal', () => {
    addToCart({ productId: 'p1', title: 'A', price: 100, cover: '/a.jpg', qty: 1 });
    setCartCoupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10, discountAmount: 0 });
    expect(getCartDiscount(getCartState())).toBe(10);
  });

  it('applies a fixed coupon but never discounts more than the subtotal', () => {
    addToCart({ productId: 'p1', title: 'A', price: 5, cover: '/a.jpg', qty: 1 });
    setCartCoupon({ code: 'FLAT20', discountType: 'fixed', discountValue: 20, discountAmount: 0 });
    // subtotal is only $5 — discount must clamp to $5, not the full $20
    expect(getCartDiscount(getCartState())).toBe(5);
  });

  it('removing the coupon zeroes the discount', () => {
    addToCart({ productId: 'p1', title: 'A', price: 100, cover: '/a.jpg', qty: 1 });
    setCartCoupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10, discountAmount: 0 });
    removeCartCoupon();
    expect(getCartDiscount(getCartState())).toBe(0);
  });

  it('sums weight × qty across lines', () => {
    addToCart({ productId: 'p1', title: 'A', price: 10, cover: '/a.jpg', qty: 2, weight: 0.5 });
    addToCart({ productId: 'p2', title: 'B', price: 10, cover: '/b.jpg', qty: 1, weight: 1 });
    expect(getCartWeight(getCartState())).toBe(2); // 0.5*2 + 1*1
  });

  it('charges a flat base rate with zero weight and a higher rate for express', () => {
    const state = getCartState(); // empty cart, weight 0
    expect(getCartShippingCost(state, 'standard')).toBe(5);
    expect(getCartShippingCost(state, 'express')).toBe(15);
  });

  it('adds weight-based shipping on top of the base rate', () => {
    addToCart({ productId: 'p1', title: 'A', price: 10, cover: '/a.jpg', qty: 1, weight: 1 });
    // 1kg → ceil(1/0.5)*2 = $4 extra over the $5 standard base = $9
    expect(getCartShippingCost(getCartState(), 'standard')).toBe(9);
  });

  it('computes the grand total as subtotal - discount + shipping', () => {
    addToCart({ productId: 'p1', title: 'A', price: 100, cover: '/a.jpg', qty: 1 });
    setCartCoupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10, discountAmount: 0 });
    const state = getCartState();
    // subtotal 100, discount 10, standard shipping 5 (no weight) => 95
    expect(getCartTotal(state, 'standard')).toBe(95);
  });
});

describe('cart persistence', () => {
  // getCartState() serves an in-memory cache that only refreshes on a write
  // or a same-key `storage` event — poking localStorage directly doesn't
  // invalidate it, so these two tests re-import the module fresh per case
  // to exercise the actual on-load parse path (safeParse/readState).
  it('migrates a legacy templateId field to productId on read', async () => {
    window.localStorage.setItem(
      'craftify_cart_v1',
      JSON.stringify({ items: [{ templateId: 'legacy-1', title: 'Old', price: 9, cover: '/x.jpg', qty: 1 }], coupon: null }),
    );
    const fresh = await import(/* @vite-ignore */ `./cartStore.ts?case=migrate-${Date.now()}`);
    const state = fresh.getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe('legacy-1');
  });

  it('recovers to an empty cart from corrupted JSON instead of throwing', async () => {
    window.localStorage.setItem('craftify_cart_v1', '{not valid json');
    const fresh = await import(/* @vite-ignore */ `./cartStore.ts?case=corrupt-${Date.now()}`);
    expect(() => fresh.getCartState()).not.toThrow();
    expect(fresh.getCartState().items).toEqual([]);
  });
});
