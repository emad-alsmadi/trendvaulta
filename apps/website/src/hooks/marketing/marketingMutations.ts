import { useMutation } from '@tanstack/react-query';
import { contactApi, newsletterApi } from '@/lib/api';
import type { ContactMessagePayload } from '@/lib/api';

/**
 * Newsletter signup — POST /api/newsletter.
 *
 * Nothing is cached: the endpoint deliberately answers the same way for a
 * new and an existing address, so there is no subscriber state to read back
 * and therefore nothing to invalidate.
 */
export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      source?: 'footer' | 'checkout' | 'other';
    }) => {
      return await newsletterApi.subscribe(payload);
    },
  });
}

/** Newsletter double opt-in confirmation — POST /api/newsletter/confirm. */
export function useConfirmNewsletter() {
  return useMutation({
    mutationFn: (payload: { email: string; exp: string; token: string }) =>
      newsletterApi.confirm(payload),
  });
}

/** Signed unsubscribe link — POST /api/newsletter/unsubscribe. */
export function useUnsubscribeNewsletter() {
  return useMutation({
    mutationFn: (payload: { email: string; token: string }) =>
      newsletterApi.unsubscribe(payload),
  });
}

/** Contact form — POST /api/contact. */
export function useSendContactMessage() {
  return useMutation({
    mutationFn: async (payload: ContactMessagePayload) => {
      return await contactApi.sendMessage(payload);
    },
  });
}
