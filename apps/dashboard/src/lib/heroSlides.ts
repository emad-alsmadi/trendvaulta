import type { HeroSlide } from './api';
import type { MessageKey } from '../i18n/en';

/**
 * Slides without an English title are rejected by the API. Returns a message
 * key + values (shown in the reader's language), or null when all is well.
 */
export function validateHeroSlides(
  slides: HeroSlide[],
): { key: MessageKey; vars: { n: number } } | null {
  const missing = slides.findIndex((s) => !s.title?.trim());
  return missing === -1 ? null : { key: 'heroSlides.missingTitle', vars: { n: missing + 1 } };
}
