import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The custom type sizes (tailwind.config.js) must be registered as font sizes,
 * or tailwind-merge reads `text-caption` as a colour and drops
 * `text-muted-foreground` (or vice versa) when both are passed.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['page-title', 'section', 'card-title', 'body', 'body-sm', 'caption', 'kpi'] },
      ],
    },
  },
});

/** Conditional class names with later Tailwind utilities winning conflicts. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
