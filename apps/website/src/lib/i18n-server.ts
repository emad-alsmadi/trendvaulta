/**
 * Translations for server components (pages without 'use client').
 *
 *   const { t, formatPrice, locale } = await getTranslation();
 *
 * Reads the same `tv_locale` cookie as the root layout, so a server-rendered
 * page and the client components inside it always agree on the language.
 * Server-only: it uses next/headers.
 */
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, resolveLocale, type Locale } from '@/lib/locale';
import { createPriceFormatter, createTranslator, type Translate } from '@/lib/i18n';

export async function getTranslation(): Promise<{
  locale: Locale;
  t: Translate;
  formatPrice: (amount: number) => string;
}> {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    t: createTranslator(locale),
    formatPrice: createPriceFormatter(locale),
  };
}
