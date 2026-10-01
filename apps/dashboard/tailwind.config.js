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
        // Legacy gray-* classes resolve to the 0%-saturation scale.
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

        // The navigation rail: dark in both themes.
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          muted: token('sidebar-muted'),
          accent: token('sidebar-accent'),
          border: token('sidebar-border'),
        },
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
        card: 'var(--shadow-card)',
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
        'page-enter': 'page-enter 200ms ease-out',
        'overlay-in': 'overlay-in 150ms ease-out',
        'pop-in': 'pop-in 150ms ease-out',
        progress: 'progress-slide 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
