/**
 * Chart ink — greyscale only, mirroring the monochrome tokens in index.css
 * (recharts needs literal colours, so the steps live here).
 *
 * Series are told apart by lightness step plus stroke pattern (solid vs
 * dashed), point markers and direct labels, never by hue. Every series step
 * is at least 3:1 against its card surface; `muted` (tick text) matches
 * --muted-foreground so axis labels meet 4.5:1.
 */
export type ChartTheme = {
  revenue: string;
  orders: string;
  bar: string;
  barAlt: string;
  grid: string;
  axis: string;
  muted: string;
  surface: string;
  border: string;
  /** strokeDasharray per series: primary stays solid, secondary is dashed. */
  revenueDash: string;
  ordersDash: string;
};

const LIGHT: ChartTheme = {
  revenue: '#0a0a0a',
  orders: '#525252',
  bar: '#171717',
  barAlt: '#525252',
  grid: '#f0f0f0',
  axis: '#d4d4d4',
  muted: '#6b6b6b',
  surface: '#ffffff',
  border: 'rgba(0,0,0,0.08)',
  revenueDash: '0',
  ordersDash: '5 4',
};

const DARK: ChartTheme = {
  revenue: '#fafafa',
  orders: '#a3a3a3',
  bar: '#e5e5e5',
  barAlt: '#a3a3a3',
  grid: '#1f1f1f',
  axis: '#333333',
  muted: '#a1a1a1',
  surface: '#121212',
  border: 'rgba(255,255,255,0.10)',
  revenueDash: '0',
  ordersDash: '5 4',
};

export const chartTheme = (theme: 'light' | 'dark'): ChartTheme =>
  theme === 'dark' ? DARK : LIGHT;

/**
 * Whole-dollar USD for tiles and chart labels. `tag` is a BCP 47 locale
 * (intlLocale(locale) from the i18n provider); English is the default.
 */
export const money = (n: number, tag = 'en-US') =>
  new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

/** "2026-09-23" -> "23 Sep" (or the locale's short month), for a narrow axis. */
export const shortDate = (iso: string, tag = 'en-US') => {
  const [, m, d] = iso.split('-');
  const month = new Date(`${iso}T00:00:00Z`).toLocaleString(tag, {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${Number(d)} ${month || m}`;
};
