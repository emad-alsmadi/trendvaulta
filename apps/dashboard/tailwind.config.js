import colors from 'tailwindcss/colors';

/** Monochrome token: `hsl(var(--x))` with Tailwind opacity modifiers (bg-primary/10). */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Transitional: the legacy gray-* classes resolve to the 0%-saturation scale
        // until each page moves to the semantic tokens below.
        gray: colors.neutral,

        canvas: token('canvas'),
        background: token('background'),
        foreground: token('foreground'),
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        raised: token('raised'),
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        input: token('input'),
        ring: token('ring'),
        backdrop: 'hsl(var(--backdrop))',

        // Brand identity colors - matching website's purple/indigo/cyan theme
        brand: {
          purple: '#9333ea',
          indigo: '#6366f1',
          cyan: '#06b6d4',
          fuchsia: '#a21caf',
          'purple-light': '#a855f7',
          'indigo-light': '#818cf8',
          'cyan-light': '#22d3ee',
        },
        // Brand light opacity variants
        'brand-purple': '#9333ea',
        'brand-indigo': '#6366f1',
        'brand-cyan': '#06b6d4',
        // Dashboard metric colors
        metric: {
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          pink: '#ec4899',
          teal: '#14b8a6',
        },
        // Metric light variants for backgrounds
        'metric-green': '#10b981',
        'metric-teal': '#14b8a6',
        'metric-blue': '#3b82f6',
        'metric-orange': '#f59e0b',
        'metric-red': '#ef4444',
        'metric-pink': '#ec4899',
        // Light opacity variants for backgrounds
        'brand-purple-light': '#a855f7',
        'brand-indigo-light': '#818cf8',
        'brand-cyan-light': '#22d3ee',
        'metric-green-light': '#34d399',
        'metric-teal-light': '#2dd4bf',
        'metric-blue-light': '#60a5fa',
        'metric-orange-light': '#fbbf24',
        'metric-red-light': '#f87171',
        'metric-pink-light': '#f472b6',
      },
      borderColor: {
        DEFAULT: token('border'),
      },
      ringColor: {
        DEFAULT: token('ring'),
      },
      ringOffsetColor: {
        DEFAULT: token('background'),
      },
      borderRadius: {
        control: 'var(--radius-control)',
        badge: 'var(--radius-badge)',
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
      },
      fontFamily: {
        // Inter only when installed locally — nothing is downloaded.
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          '"Noto Sans Arabic"',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'page-title': [
          '1.5rem',
          { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        section: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'card-title': [
          '0.875rem',
          { lineHeight: '1.25rem', fontWeight: '500' },
        ],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.125rem' }],
        // Pair with `uppercase text-muted-foreground` (the tracking is dropped in RTL).
        caption: [
          '0.75rem',
          { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '500' },
        ],
        kpi: [
          '1.75rem',
          {
            lineHeight: '2.25rem',
            letterSpacing: '-0.02em',
            fontWeight: '600',
          },
        ],
      },
      spacing: {
        sidebar: '16rem', // 256px
        rail: '4rem', // 64px collapsed sidebar
        topbar: '4rem', // 64px
        // 4px base with 8px rhythm (Tailwind already has 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
        // These are semantic aliases for commonly used patterns
        'section-xs': '0.5rem', // 8px
        'section-sm': '0.75rem', // 12px
        'section-md': '1rem', // 16px
        'section-lg': '1.5rem', // 24px
        'section-xl': '2rem', // 32px
        'section-2xl': '2.5rem', // 40px
        'section-3xl': '3rem', // 48px
        'section-4xl': '4rem', // 64px
      },
      maxWidth: {
        content: '90rem', // 1440px
        'dialog-confirm': '30rem', // 480px
        'dialog-form': '40rem', // 640px
        'dialog-editor': '55rem', // 880px
        login: '25rem', // 400px
      },
      height: {
        'control-sm': '2rem', // 32px
        control: '2.25rem', // 36px
        'control-lg': '2.5rem', // 40px
      },
      minHeight: {
        control: '2.25rem',
        touch: '2.5rem',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
      },
      animation: {
        'skeleton-shimmer': 'skeleton-shimmer 1.5s ease-in-out infinite',
        'page-enter': 'page-enter 200ms ease-out',
        'page-exit': 'page-exit 150ms ease-in',
      },
      // Skeleton shape utilities
      skeleton: {
        text: 'h-4 w-full rounded-control',
        avatar: 'size-10 rounded-full',
        thumbnail: 'size-10 rounded-control',
        card: 'h-24 w-full rounded-card',
        kpi: 'h-10 w-32 rounded-control',
        button: 'h-control w-20 rounded-control',
        badge: 'h-6 w-12 rounded-badge',
      },
      // Icon sizing (Lucide standard sizes)
      icon: {
        xs: '0.875rem', // 14px
        sm: '1rem', // 16px
        md: '1.125rem', // 18px
        lg: '1.25rem', // 20px
        xl: '1.5rem', // 24px
      },
    },
  },
  plugins: [],
};
