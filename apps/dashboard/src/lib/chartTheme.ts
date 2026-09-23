/**
 * Chart ink and series colours.
 *
 * The two modes are separately stepped for their own surface, not flipped, and
 * each pair was validated for colour-vision separation and contrast against
 * that surface. Change a value here only alongside re-running that check.
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
};

const LIGHT: ChartTheme = {
  revenue: '#2a78d6',
  orders: '#1baf7a',
  bar: '#2a78d6',
  barAlt: '#4a3aa7',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  surface: '#ffffff',
  border: 'rgba(11,11,11,0.10)',
};

const DARK: ChartTheme = {
  revenue: '#3987e5',
  orders: '#199e70',
  bar: '#3987e5',
  barAlt: '#9085e9',
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  surface: '#1f2937',
  border: 'rgba(255,255,255,0.10)',
};

export const chartTheme = (theme: 'light' | 'dark'): ChartTheme =>
  theme === 'dark' ? DARK : LIGHT;

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

/** "2026-09-23" -> "23 Sep", for an axis that must stay narrow. */
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  const month = new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${Number(d)} ${month || m}`;
};
