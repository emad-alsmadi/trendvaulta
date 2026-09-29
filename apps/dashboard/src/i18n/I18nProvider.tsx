import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type MessageKey, type Messages } from './en';
import { ar } from './ar';

export type Locale = 'en' | 'ar';
type Vars = Record<string, string | number>;

const MESSAGES: Record<Locale, Messages> = { en, ar };
const STORAGE_KEY = 'tv_admin_locale';

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function translator(locale: Locale) {
  return (key: MessageKey, vars?: Vars) => {
    const template = lookup(MESSAGES[locale], key) ?? lookup(en, key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
  };
}

/** BCP 47 tag for Intl: Arabic keeps Latin digits, same as the storefront. */
// eslint-disable-next-line react-refresh/only-export-components -- tiny helper shared with the hook
export function intlLocale(locale: Locale) {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}

type I18n = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof translator>;
  /** Locale-aware number formatting (Latin digits in both languages). */
  formatNumber: (n: number) => string;
};

function build(locale: Locale, setLocale: (l: Locale) => void): I18n {
  const nf = new Intl.NumberFormat(intlLocale(locale));
  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    setLocale,
    t: translator(locale),
    formatNumber: (n) => nf.format(n),
  };
}

// Default = English, so components still render outside the provider (tests).
const I18nContext = createContext<I18n>(build('en', () => {}));

function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the choice lasts for this tab only.
    }
  }, []);

  const value = useMemo(() => build(locale, setLocale), [locale, setLocale]);

  // <html lang dir> drives RTL layout (logical Tailwind classes + rtl: variants).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = value.dir;
  }, [locale, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
export function useT() {
  return useContext(I18nContext);
}
