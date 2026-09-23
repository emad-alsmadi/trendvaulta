'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';

type Locale = 'en' | 'ar';
type Currency = 'USD' | 'SAR' | 'EUR';

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  formatPrice: (amount: number) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

const messages = {
  en: enMessages,
  ar: arMessages,
};

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  SAR: 'ر.س',
  EUR: '€',
};

const currencyLocales: Record<Currency, Locale> = {
  USD: 'en',
  SAR: 'ar',
  EUR: 'en',
};

const isLocale = (value: string | null): value is Locale =>
  value === 'en' || value === 'ar';

const isCurrency = (value: string | null): value is Currency =>
  value !== null && value in currencySymbols;

const LOCALE_KEY = 'tv_locale';
const CURRENCY_KEY = 'tv_currency';

// The reader's locale and currency live in localStorage, which React does not
// own, so they are read through useSyncExternalStore: the server snapshot is
// the default, the client snapshot is the stored value, and a write notifies
// every subscriber (including other tabs, via the native `storage` event).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function writePreference(key: string, value: string) {
  localStorage.setItem(key, value);
  for (const notify of listeners) notify();
}

const readLocale = (): Locale => {
  const saved = localStorage.getItem(LOCALE_KEY);
  return isLocale(saved) ? saved : 'en';
};

const readCurrency = (): Currency => {
  const saved = localStorage.getItem(CURRENCY_KEY);
  return isCurrency(saved) ? saved : 'USD';
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(
    subscribe,
    readLocale,
    () => 'en',
  );
  const currency = useSyncExternalStore<Currency>(
    subscribe,
    readCurrency,
    () => 'USD',
  );

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  // The <html> element is the one piece of state React does not own here, so
  // it is synchronised in one place rather than at each call site. Server
  // render emits lang="en"/dir="ltr"; this corrects it after hydration.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = (newLocale: Locale) => {
    writePreference(LOCALE_KEY, newLocale);

    // Arabic browsing defaults to SAR pricing, English back to USD. A currency
    // the reader picked explicitly for the other locale is left alone.
    if (newLocale === 'ar' && currency === 'USD') {
      writePreference(CURRENCY_KEY, 'SAR');
    } else if (newLocale === 'en' && currency === 'SAR') {
      writePreference(CURRENCY_KEY, 'USD');
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    writePreference(CURRENCY_KEY, newCurrency);

    const targetLocale = currencyLocales[newCurrency];
    if (targetLocale !== locale) writePreference(LOCALE_KEY, targetLocale);
  };

  const t = (key: string): string => {
    let value: unknown = messages[locale];
    for (const k of key.split('.')) {
      if (typeof value !== 'object' || value === null) return key;
      value = (value as Record<string, unknown>)[k];
    }
    return typeof value === 'string' ? value : key;
  };

  const formatPrice = (amount: number): string => {
    const symbol = currencySymbols[currency];
    return `${symbol}${amount.toFixed(2)}`;
  };

  return (
    <TranslationContext.Provider
      value={{ locale, setLocale, currency, setCurrency, t, dir, formatPrice }}
    >
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
