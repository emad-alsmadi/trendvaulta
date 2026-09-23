'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useTransition,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';
import {
  LOCALE_COOKIE,
  dirFor,
  intlLocale,
  isLocale,
  type Locale,
} from '@/lib/locale';
import { formatCurrency } from '@/lib/utils';

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  /** USD, formatted for the reader's language. Checkout charges USD, so no
   *  other currency is ever displayed. */
  formatPrice: (amount: number) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

const messages = {
  en: enMessages,
  ar: arMessages,
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** The pre-cookie build kept the choice in localStorage. */
const LEGACY_LOCALE_KEY = 'tv_locale';
const LEGACY_CURRENCY_KEY = 'tv_currency';

/**
 * The locale is not client state: it is the cookie value the root layout
 * read for this request, passed in as `initialLocale`. Switching writes the
 * cookie and refreshes, and the layout hands down the new value — so server
 * and client can never disagree, and `<html lang dir>` is right in the HTML.
 * (router.refresh() keeps client state such as the React Query cache.)
 */
export function TranslationProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const locale = initialLocale;
  const dir = dirFor(locale);

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocaleCookie(next);
      startTransition(() => router.refresh());
    },
    [router],
  );

  // A client-side switch only re-renders <body>'s tree; <html> itself is
  // not re-created, so its attributes are kept in step here.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  // One-time migration for readers who chose Arabic before the cookie
  // existed (the old build kept it in localStorage).
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_LOCALE_KEY);
      localStorage.removeItem(LEGACY_LOCALE_KEY);
      localStorage.removeItem(LEGACY_CURRENCY_KEY);
      const hasCookie = document.cookie
        .split('; ')
        .some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
      if (!hasCookie && isLocale(legacy) && legacy !== locale) {
        setLocale(legacy);
      }
    } catch {
      // storage unavailable (private mode) — nothing to migrate
    }
    // Mount-only by design: it migrates once, not on every locale change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<TranslationContextType>(() => {
    const t = (key: string): string => {
      let node: unknown = messages[locale];
      for (const k of key.split('.')) {
        if (typeof node !== 'object' || node === null) return key;
        node = (node as Record<string, unknown>)[k];
      }
      if (typeof node === 'string') return node;
      // Missing in Arabic: fall back to English rather than show a raw key.
      if (locale !== 'en') {
        let fallback: unknown = messages.en;
        for (const k of key.split('.')) {
          if (typeof fallback !== 'object' || fallback === null) return key;
          fallback = (fallback as Record<string, unknown>)[k];
        }
        if (typeof fallback === 'string') return fallback;
      }
      return key;
    };
    return {
      locale,
      setLocale,
      t,
      dir,
      formatPrice: (amount: number) =>
        formatCurrency(amount, 'USD', intlLocale(locale)),
    };
  }, [locale, dir, setLocale]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}
