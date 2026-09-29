import { describe, expect, it } from 'vitest';
import en from './en.json';
import ar from './ar.json';

/**
 * Dictionary parity. lib/i18n.ts silently falls back to English for a missing
 * Arabic key, so without this check a missing translation only shows up as
 * English text on the Arabic storefront. Runs in CI with the website tests.
 */

type Tree = { [key: string]: string | Tree };

/** Every leaf as `dot.path` → string value. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** `{name}` placeholders, as interpolated by createTranslator. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const enKeys = flatten(en as Tree);
const arKeys = flatten(ar as Tree);

describe('message dictionaries', () => {
  it('ar.json has every key in en.json', () => {
    const missing = [...enKeys.keys()].filter((k) => !arKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('ar.json has no key that en.json lacks', () => {
    const extra = [...arKeys.keys()].filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });

  it('uses the same {placeholders} in both languages', () => {
    const mismatched = [...enKeys]
      .filter(([key]) => arKeys.has(key))
      .filter(
        ([key, value]) =>
          placeholders(value).join() !== placeholders(arKeys.get(key)!).join(),
      )
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('has no empty translations', () => {
    const empty = [...enKeys, ...arKeys]
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
