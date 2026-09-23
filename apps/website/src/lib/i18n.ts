/**
 * Message lookup shared by the client provider (TranslationContext) and
 * server components (lib/i18n-server.ts), so both behave identically:
 * dot-path keys, `{name}` placeholders, English fallback for missing keys.
 */
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';
import { intlLocale, type Locale } from '@/lib/locale';
import { formatCurrency } from '@/lib/utils';

export type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const messages: Record<Locale, unknown> = { en: enMessages, ar: arMessages };

function lookup(tree: unknown, key: string): string | undefined {
  let node = tree;
  for (const k of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[k];
  }
  return typeof node === 'string' ? node : undefined;
}

export function createTranslator(locale: Locale): Translate {
  return (key, vars) => {
    // Missing in Arabic: fall back to English rather than show a raw key.
    const template =
      lookup(messages[locale], key) ?? lookup(messages.en, key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}

/** USD for the reader's language — checkout charges USD only. */
export function createPriceFormatter(locale: Locale) {
  return (amount: number) => formatCurrency(amount, 'USD', intlLocale(locale));
}
