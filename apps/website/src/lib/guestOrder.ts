/**
 * Guest checkout (plan P0-03): the per-order token that stands in for a
 * session. It comes back from the checkout call and survives the Stripe
 * round trip in sessionStorage (same tab, cleared with it). The order email
 * carries the same token in its /guest-order link.
 */
const KEY_PREFIX = 'tv_guest_order:';

export function rememberGuestToken(orderId: string, token: string) {
  try {
    window.sessionStorage.setItem(KEY_PREFIX + orderId, token);
  } catch {
    // Private mode / storage off: the order email still has the link
  }
}

export function readGuestToken(orderId: string | null | undefined): string | null {
  if (!orderId || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + orderId);
  } catch {
    return null;
  }
}

/** Link to the guest order page. */
export function guestOrderHref(orderId: string, token: string) {
  const params = new URLSearchParams({ order: orderId, token });
  return `/guest-order?${params}`;
}
