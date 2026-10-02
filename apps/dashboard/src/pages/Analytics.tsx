import { useMemo, useState } from 'react';
import {
  Award,
  DollarSign,
  LineChart as LineChartIcon,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Table2,
  Tag,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminAnalytics } from '../hooks/useAdminStats';
import { useTheme } from '../hooks/useTheme';
import { chartTheme, money, shortDate } from '../lib/chartTheme';
import { intlLocale, useT } from '../i18n/I18nProvider';
import {
  errorMessage,
  type AdminAnalyticsLeader,
  type AdminAnalyticsPoint,
} from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Table, THead, Th, Tr, Td } from '../components/ui/Table';
import { focusRing } from '../components/ui/styles';
import { cn } from '../lib/cn';

const RANGES = [
  { days: 7, label: 'analytics.last7' },
  { days: 30, label: 'analytics.last30' },
  { days: 90, label: 'analytics.last90' },
] as const;

/** Stable identity so the totals memo does not recompute on every render. */
const EMPTY_SERIES: AdminAnalyticsPoint[] = [];

function TooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: Array<{ name: string; value: string }>;
}) {
  return (
    <div className='rounded-badge border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-overlay'>
      <p className='mb-1 font-semibold text-foreground'>{label}</p>
      {rows.map((r) => (
        <p
          key={r.name}
          className='text-muted-foreground'
        >
          {r.name}:{' '}
          <span className='font-medium text-foreground'>{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Long product/brand names need the category axis on the left, not the bottom. */
function LeaderChart({
  rows,
  color,
  emptyLabel,
}: {
  rows: AdminAnalyticsLeader[];
  color: string;
  emptyLabel: string;
}) {
  const ink = useTheme().theme;
  const t = chartTheme(ink);
  const i18n = useT();
  const tag = intlLocale(i18n.locale);
  const rtl = i18n.dir === 'rtl';

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Award aria-hidden />}
        title={emptyLabel}
      />
    );
  }

  const data = rows.map((r) => ({
    name: r.title || r.name || i18n.t('analytics.unknown'),
    revenue: r.revenue,
    units: r.units,
  }));

  return (
    <ResponsiveContainer
      width='100%'
      height={Math.max(180, data.length * 38)}
    >
      {/* SVG ignores dir="rtl": mirror by hand — names on the inline-start
          edge, bars growing toward the inline end. */}
      <BarChart
        data={data}
        layout='vertical'
        margin={rtl ? { left: 56, right: 4 } : { left: 4, right: 56 }}
      >
        <XAxis
          type='number'
          hide
          reversed={rtl}
        />
        <YAxis
          type='category'
          dataKey='name'
          orientation={rtl ? 'right' : 'left'}
          width={132}
          tick={{ fill: t.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: t.axis }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: t.grid, fillOpacity: 0.4 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipCard
                label={String(payload[0].payload.name)}
                rows={[
                  {
                    name: i18n.t('analytics.revenue'),
                    value: money(payload[0].payload.revenue, tag),
                  },
                  {
                    name: i18n.t('analytics.units'),
                    value: i18n.formatNumber(payload[0].payload.units),
                  },
                ]}
              />
            ) : null
          }
        />
        <Bar
          isAnimationActive={false}
          dataKey='revenue'
          radius={rtl ? [4, 0, 0, 4] : [0, 4, 4, 0]}
          barSize={14}
        >
          {data.map((row) => (
            <Cell
              key={row.name}
              fill={color}
            />
          ))}
          <LabelList
            dataKey='revenue'
            position={rtl ? 'left' : 'right'}
            formatter={(v: number) => money(v, tag)}
            style={{ fill: t.muted, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Analytics() {
  const { theme } = useTheme();
  const t = chartTheme(theme);
  const i18n = useT();
  const tag = intlLocale(i18n.locale);
  const rtl = i18n.dir === 'rtl';
  const fmtMoney = (n: number) => money(n, tag);
  const [days, setDays] = useState(30);
  const [asTable, setAsTable] = useState(false);
  const q = useAdminAnalytics(days);

  const series = q.data?.series ?? EMPTY_SERIES;
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, p) => ({
          revenue: acc.revenue + p.revenue,
          orders: acc.orders + p.orders,
        }),
        { revenue: 0, orders: 0 },
      ),
    [series],
  );

  const avgOrder = totals.orders > 0 ? totals.revenue / totals.orders : 0;

  const axis = {
    dataKey: 'date' as const,
    tickFormatter: (iso: string) => shortDate(iso, tag),
    tick: { fill: t.muted, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: t.axis },
    // A 90-day window cannot fit 90 labels; let recharts thin them out.
    minTickGap: 24,
    // Time reads right-to-left in Arabic (SVG ignores dir="rtl").
    reversed: rtl,
  };
  const valueAxisSide = rtl ? ('right' as const) : ('left' as const);
  const rangeNote = (
    <p className='text-body-sm text-muted-foreground'>
      {i18n.t('analytics.lastDays', { days })}
    </p>
  );

  return (
    <div className='space-y-6'>
      <PageHeader
        title={i18n.t('analytics.title')}
        description={i18n.t('analytics.subtitle')}
        className='mb-2'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            {/* Date Range Selector */}
            <div className='inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-muted p-0.5'>
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type='button'
                  onClick={() => setDays(r.days)}
                  aria-pressed={days === r.days}
                  className={cn(
                    'inline-flex h-full items-center rounded px-3 text-body-sm font-medium transition-colors duration-fast',
                    focusRing,
                    days === r.days
                      ? 'border border-border bg-background text-foreground shadow-card'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {i18n.t(r.label)}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <Button
              variant='secondary'
              onClick={() => setAsTable((v) => !v)}
              icon={
                asTable ? <LineChartIcon aria-hidden /> : <Table2 aria-hidden />
              }
            >
              {asTable ? i18n.t('analytics.charts') : i18n.t('analytics.table')}
            </Button>

            {/* Refresh */}
            <Button
              variant='secondary'
              onClick={() => void q.refetch()}
              icon={
                <RefreshCw
                  className={cn(q.isFetching && 'animate-spin')}
                  aria-hidden
                />
              }
            >
              {i18n.t('analytics.refresh')}
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {q.isError && (
        <Alert tone='error'>
          {errorMessage(q.error, i18n.t('analytics.loadFailed'))}
        </Alert>
      )}

      {/* KPI Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {q.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label={i18n.t('analytics.revenueTotal')}
              value={fmtMoney(totals.revenue)}
              icon={<DollarSign />}
              footer={rangeNote}
            />
            <StatCard
              label={i18n.t('analytics.ordersTotal')}
              value={i18n.formatNumber(totals.orders)}
              icon={<ShoppingCart />}
              footer={rangeNote}
            />
            <StatCard
              label={i18n.t('analytics.averageOrder')}
              value={fmtMoney(avgOrder)}
              icon={<Receipt />}
              footer={rangeNote}
            />
          </>
        )}
      </div>

      {/* Daily Totals (Table or Charts) */}
      {asTable ? (
        <Card padded={false}>
          <div className='p-5 pb-0 sm:p-6 sm:pb-0'>
            <CardHeader
              icon={<Table2 />}
              title={i18n.t('analytics.dailyTotals')}
            />
          </div>
          <div className='max-h-[32rem] overflow-auto border-t border-border'>
            <Table className='min-w-[420px]'>
              <THead>
                <tr>
                  <Th>{i18n.t('analytics.date')}</Th>
                  <Th numeric>{i18n.t('analytics.revenue')}</Th>
                  <Th numeric>{i18n.t('analytics.orders')}</Th>
                </tr>
              </THead>
              <tbody>
                {series.map((p) => (
                  <Tr key={p.date}>
                    <Td
                      className='text-foreground'
                      dir='ltr'
                    >
                      {p.date}
                    </Td>
                    <Td
                      numeric
                      className='font-medium'
                    >
                      {fmtMoney(p.revenue)}
                    </Td>
                    <Td numeric>{i18n.formatNumber(p.orders)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        // Revenue and orders are different scales, so they get a chart each
        // rather than a second y-axis.
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader icon={<TrendingUp />} title={i18n.t('analytics.revenue')} />
            <ResponsiveContainer
              width='100%'
              height={240}
            >
              <AreaChart
                data={series}
                margin={{ left: 4, right: 8, top: 4 }}
              >
                <defs>
                  <linearGradient
                    id='revFill'
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor={t.revenue}
                      stopOpacity={0.24}
                    />
                    <stop
                      offset='100%'
                      stopColor={t.revenue}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={t.grid}
                  vertical={false}
                />
                <XAxis {...axis} />
                <YAxis
                  orientation={valueAxisSide}
                  tick={{ fill: t.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => fmtMoney(v)}
                />
                <Tooltip
                  cursor={{ stroke: t.axis, strokeWidth: 1 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TooltipCard
                        label={shortDate(String(label), tag)}
                        rows={[
                          {
                            name: i18n.t('analytics.revenue'),
                            value: fmtMoney(Number(payload[0].value)),
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Area
                  isAnimationActive={false}
                  type='monotone'
                  dataKey='revenue'
                  stroke={t.revenue}
                  strokeWidth={2}
                  fill='url(#revFill)'
                  activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface }}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader icon={<LineChartIcon />} title={i18n.t('analytics.orders')} />
            <ResponsiveContainer
              width='100%'
              height={240}
            >
              <LineChart
                data={series}
                margin={{ left: 4, right: 8, top: 4 }}
              >
                <CartesianGrid
                  stroke={t.grid}
                  vertical={false}
                />
                <XAxis {...axis} />
                <YAxis
                  orientation={valueAxisSide}
                  tick={{ fill: t.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: t.axis, strokeWidth: 1 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TooltipCard
                        label={shortDate(String(label), tag)}
                        rows={[
                          {
                            name: i18n.t('analytics.orders'),
                            value: i18n.formatNumber(Number(payload[0].value)),
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Line
                  isAnimationActive={false}
                  type='monotone'
                  dataKey='orders'
                  stroke={t.orders}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Top Products and Brands */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader icon={<Award />} title={i18n.t('analytics.topProducts')} />
          <LeaderChart
            rows={q.data?.topProducts ?? []}
            color={t.bar}
            emptyLabel={i18n.t('analytics.empty')}
          />
        </Card>
        <Card>
          <CardHeader icon={<Tag />} title={i18n.t('analytics.topBrands')} />
          <LeaderChart
            rows={q.data?.topBrands ?? []}
            color={t.barAlt}
            emptyLabel={i18n.t('analytics.empty')}
          />
        </Card>
      </div>
    </div>
  );
}
