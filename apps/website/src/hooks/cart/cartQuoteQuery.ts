'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { paymentsApi, type CartQuoteResponse } from '@/lib/api';
import {
  getCartLineKey,
  removeFromCart,
  setCartQty,
  syncCartLine,
  type CartItem,
} from '@/lib/cartStore';

export type CartQuoteOptions = {
  items: CartItem[];
  couponCode?: string;
  delivery?: boolean;
  shippingMethod?: string;
};

export function cartQuoteKey(opts: CartQuoteOptions) {
  return [
    'cart',
    'quote',
    opts.items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      variant: i.variant ?? null,
    })),
    opts.couponCode ?? '',
    opts.shippingMethod ?? (opts.delivery ? 'standard' : 'none'),
  ];
}

/**
 * Server-side cart revalidation (POST /api/payments/quote).
 * Resolves to `null` when the endpoint is unavailable (404) so callers can
 * fall back to client-side totals without surfacing an error.
 */
export function useCartQuote(opts: CartQuoteOptions) {
  return useQuery<CartQuoteResponse | null>({
    queryKey: cartQuoteKey(opts),
    queryFn: async () => {
      try {
        return await paymentsApi.getQuote({
          items: opts.items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            variant: i.variant,
          })),
          couponCode: opts.couponCode || undefined,
          delivery: opts.delivery,
          shippingMethod:
            opts.shippingMethod ?? (opts.delivery ? 'standard' : 'none'),
        });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: opts.items.length > 0,
    staleTime: 30_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export type CartLineNotice = {
  code:
    | 'insufficient_stock'
    | 'price_changed'
    | 'unavailable'
    | 'variant_required';
  message: string;
  /** Line title, kept so a notice can still be shown after the line is removed. */
  title: string;
};

function noticeFor(
  code: CartLineNotice['code'],
  title: string,
  available?: number,
): CartLineNotice {
  switch (code) {
    case 'insufficient_stock':
      return {
        code,
        title,
        message:
          typeof available === 'number' && available > 0
            ? `Only ${available} left, quantity adjusted`
            : 'Out of stock — removed from your cart',
      };
    case 'price_changed':
      return { code, title, message: 'Price updated' };
    case 'unavailable':
      return {
        code,
        title,
        message: 'No longer available — removed from your cart',
      };
    case 'variant_required':
      return {
        code,
        title,
        message: 'Please choose a size or colour for this item',
      };
  }
}

type QuoteSyncPlan = {
  notices: Record<string, CartLineNotice>;
  /** Cart-store writes the quote implies, deferred so this stays pure. */
  mutations: Array<() => void>;
};

/**
 * Compares a quote against the cart and works out what has to change. Pure:
 * it only *collects* the store writes so the caller can run them in an effect.
 */
function planQuoteSync(
  quote: CartQuoteResponse | null,
  items: CartItem[],
): QuoteSyncPlan {
  const notices: Record<string, CartLineNotice> = {};
  const mutations: Array<() => void> = [];
  if (!quote) return { notices, mutations };

  const warnings = quote.warnings ?? [];

  // Match cart lines to quote lines on productId + size + colour only:
  // the API echoes the matched variant's sku, which the cart may not carry.
  const matchKey = (
    productId: string,
    variant?: { size?: string; color?: string } | null,
  ) => `${productId}|${variant?.size ?? ''}|${variant?.color ?? ''}`;
  const warningFor = (productId: string, code: CartLineNotice['code']) =>
    warnings.find((w) => w.productId === productId && w.code === code);

  // Per-line reconciliation from quote.lines (precise per variant).
  for (const line of quote.lines ?? []) {
    const lineKey = matchKey(line.productId, line.variant);
    const cartLine = items.find(
      (i) => matchKey(i.productId, i.variant) === lineKey,
    );
    if (!cartLine) continue;
    const key = getCartLineKey(cartLine);

    // `available: 0` also covers "not purchasable" reasons; classify first.
    if (warningFor(line.productId, 'unavailable')) {
      mutations.push(() => removeFromCart(key));
      notices[key] = noticeFor('unavailable', cartLine.title);
      continue;
    }
    if (warningFor(line.productId, 'variant_required')) {
      notices[key] = noticeFor('variant_required', cartLine.title);
      continue;
    }

    const available = Number(line.available);
    if (Number.isFinite(available)) {
      if (available <= 0) {
        mutations.push(() => removeFromCart(key));
        notices[key] = noticeFor('insufficient_stock', cartLine.title, 0);
        continue;
      }
      if (cartLine.qty > available) {
        mutations.push(() => setCartQty(key, available));
        notices[key] = noticeFor(
          'insufficient_stock',
          cartLine.title,
          available,
        );
      }
      if (cartLine.maxQty !== available) {
        mutations.push(() => syncCartLine(key, { maxQty: available }));
      }
    }

    const price = Number(line.price);
    if (Number.isFinite(price) && price !== cartLine.price) {
      mutations.push(() => syncCartLine(key, { price }));
      notices[key] = notices[key] ?? noticeFor('price_changed', cartLine.title);
    }
  }

  // Product-level warnings (unavailable / variant_required) fall back to
  // matching by productId when the line is not in quote.lines.
  for (const w of warnings) {
    for (const cartLine of items) {
      if (cartLine.productId !== w.productId) continue;
      const key = getCartLineKey(cartLine);
      if (notices[key]) continue;
      if (w.code === 'unavailable') {
        mutations.push(() => removeFromCart(key));
        notices[key] = noticeFor('unavailable', cartLine.title);
      } else if (w.code === 'insufficient_stock') {
        const available = Number(w.available);
        if (Number.isFinite(available)) {
          if (available <= 0) mutations.push(() => removeFromCart(key));
          else if (cartLine.qty > available)
            mutations.push(() => setCartQty(key, available));
          notices[key] = noticeFor(
            'insufficient_stock',
            cartLine.title,
            available,
          );
        }
      } else {
        notices[key] = noticeFor(w.code, cartLine.title);
      }
    }
  }

  return { notices, mutations };
}

/**
 * Runs the cart quote and applies its warnings to the cart store once per
 * quote result: caps quantities to available stock, removes unavailable
 * lines and syncs changed prices. Returns per-line notices keyed by line key
 * so pages can show a friendly inline message.
 */
export function useCartQuoteSync(opts: CartQuoteOptions) {
  const query = useCartQuote(opts);
  const appliedAtRef = useRef<number>(0);
  const itemsRef = useRef(opts.items);
  useEffect(() => {
    itemsRef.current = opts.items;
  }, [opts.items]);

  const quote = query.data ?? null;
  const dataUpdatedAt = query.dataUpdatedAt;

  // Derived from the quote, not stored: the plan is recomputed whenever a new
  // quote lands, and its notices are visible on that same render.
  const plan = useMemo(
    () => planQuoteSync(quote, itemsRef.current),
    // itemsRef is read, not tracked — a new quote is what makes the plan stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quote, dataUpdatedAt],
  );

  // A notice must outlive the quote that raised it: capping a quantity triggers
  // a refetch where the line is fine again, and the reader still needs to know
  // why their cart changed. Kept in a ref because the store writes below
  // already re-render every subscriber.
  const seenRef = useRef<Record<string, CartLineNotice>>({});

  useEffect(() => {
    if (!quote || !dataUpdatedAt || appliedAtRef.current === dataUpdatedAt) {
      return;
    }
    appliedAtRef.current = dataUpdatedAt;
    seenRef.current = { ...seenRef.current, ...plan.notices };
    for (const apply of plan.mutations) apply();
  }, [quote, dataUpdatedAt, plan]);

  const notices = { ...seenRef.current, ...plan.notices };

  return { query, quote, notices };
}
