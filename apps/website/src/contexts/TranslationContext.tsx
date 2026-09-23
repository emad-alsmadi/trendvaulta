'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
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

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    // Load saved locale from localStorage
    const saved = localStorage.getItem('tv_locale') as Locale | null;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLocaleState(saved);
    } else {
      // Set initial dir based on default locale
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }

    // Load saved currency from localStorage
    const savedCurrency = localStorage.getItem(
      'tv_currency',
    ) as Currency | null;
    if (
      savedCurrency &&
      (savedCurrency === 'USD' ||
        savedCurrency === 'SAR' ||
        savedCurrency === 'EUR')
    ) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('tv_locale', newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;

    // Auto-switch currency to match locale
    if (newLocale === 'ar' && currency === 'USD') {
      setCurrency('SAR');
    } else if (newLocale === 'en' && currency === 'SAR') {
      setCurrency('USD');
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('tv_currency', newCurrency);

    // Auto-switch locale to match currency
    const targetLocale = currencyLocales[newCurrency];
    if (targetLocale && targetLocale !== locale) {
      setLocaleState(targetLocale);
      document.documentElement.dir = targetLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = targetLocale;
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

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
