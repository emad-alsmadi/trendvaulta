/**
 * Locale plumbing shared by the server (root layout) and the client
 * (TranslationProvider). The choice lives in a cookie so the server can
 * render `<html lang dir>` correctly on the first byte — no LTR flash.
 */
export type Locale = 'en' | 'ar';

export const LOCALES: readonly Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'tv_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ar';
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * BCP 47 tag for Intl formatting. Arabic keeps Latin digits: prices, order
 * numbers and SKUs then read the same on every page, in emails and at Stripe.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}
