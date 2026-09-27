import type { HeroSlide } from './api';

/** Slides without an English title are rejected by the API. */
export function validateHeroSlides(slides: HeroSlide[]): string | null {
  const missing = slides.findIndex((s) => !s.title?.trim());
  return missing === -1 ? null : `Slide ${missing + 1} needs an English title.`;
}
