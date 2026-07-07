import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ImageLoaderProps } from 'next/image';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Hosts whose image URLs may include sizing query strings that break Next.js `/_next/image?url=…` parsing. */
const NEXT_IMAGE_STRIP_SEARCH_HOSTS = new Set([
  'images.unsplash.com',
  'images.pexels.com',
]);

/**
 * Custom loader so template covers load from the CDN directly (avoids `/_next/image` fetch
 * failures some environments hit with Unsplash).
 */
export function remoteCoverLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const q = quality ?? 75;
  const w = Math.min(Math.max(width, 64), 2048);
  try {
    const u = new URL(src);
    if (u.hostname === 'images.unsplash.com') {
      const out = new URL(src);
      out.searchParams.set('w', String(Math.round(w)));
      out.searchParams.set('q', String(q));
      out.searchParams.set('auto', 'format');
      out.searchParams.set('fit', 'max');
      return out.toString();
    }
    if (u.hostname === 'images.pexels.com') {
      const out = new URL(src);
      out.searchParams.set('w', String(Math.round(w)));
      out.searchParams.set('auto', 'compress');
      out.searchParams.set('cs', 'tinysrgb');
      return out.toString();
    }
  } catch {
    /* fallthrough */
  }

  if (src.startsWith('/')) {
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}nw=${Math.round(w)}&q=${q}`;
  }

  try {
    const u = new URL(src);
    u.searchParams.set('nw', String(Math.round(w)));
    u.searchParams.set('q', String(q));
    return u.toString();
  } catch {
    return src;
  }
}

/**
 * Returns a src safe for `next/image`: strips redundant CDN query strings so the optimizer
 * receives one encoded `url` parameter (nested `?`/`&` otherwise corrupt the request).
 */
export function normalizeRemoteImageSrc(src: string): string {
  if (!src?.trim()) return src;
  try {
    const u = new URL(src);
    if (NEXT_IMAGE_STRIP_SEARCH_HOSTS.has(u.hostname)) {
      u.search = '';
      u.hash = '';
    }
    return u.toString();
  } catch {
    return src;
  }
}
