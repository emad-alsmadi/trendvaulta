import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Table2, LineChart as LineChartIcon } from 'lucide-react';
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
import {
  errorMessage,
  type AdminAnalyticsLeader,
  type AdminAnalyticsPoint,
} from '../lib/api';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

const CARD =
  'rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800';

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
    <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-900'>
      <p className='mb-1 font-semibold text-gray-900 dark:text-white'>{label}</p>
      {rows.map((r) => (
        <p key={r.name} className='text-gray-600 dark:text-gray-300'>
          {r.name}: <span className='font-medium'>{r.value}</span>
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

  if (rows.length === 0) {
    return (
      <p className='py-12 text-center text-sm text-gray-500'>{emptyLabel}</p>
    );
  }

  const data = rows.map((r) => ({
    name: r.title || r.name || 'Unknown',
    revenue: r.revenue,
    units: r.units,
  }));

  return (
    <ResponsiveContainer width='100%' height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout='vertical' margin={{ left: 4, right: 56 }}>
        <XAxis type='number' hide />
        <YAxis
          type='category'
          dataKey='name'
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
                  { name: 'Revenue', value: money(payload[0].payload.revenue) },
                  { name: 'Units', value: String(payload[0].payload.units) },
                ]}
              />
            ) : null
          }
        />
        <Bar
          isAnimationActive={false}
          dataKey='revenue'
          radius={[0, 4, 4, 0]}
          barSize={14}
        >
          {data.map((row) => (
            <Cell key={row.name} fill={color} />
          ))}
          <LabelList
            dataKey='revenue'
            position='right'
            formatter={(v: number) => money(v)}
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
    tickFormatter: shortDate,
    tick: { fill: t.muted, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: t.axis },
    // A 90-day window cannot fit 90 labels; let recharts thin them out.
    minTickGap: 24,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Analytics
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Paid orders only — pending and canceled orders are excluded.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600'>
            {RANGES.map((r) => (
              <button
                key={r.days}
                type='button'
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  days === r.days
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type='button'
            onClick={() => setAsTable((v) => !v)}
            className='inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
          >
            {asTable ? (
              <LineChartIcon className='mr-2 h-4 w-4' />
            ) : (
              <Table2 className='mr-2 h-4 w-4' />
            )}
            {asTable ? 'Charts' : 'Table'}
          </button>
          <button
            type='button'
            onClick={() => void q.refetch()}
            className='inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {q.isError && (
        <div className='mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(q.error, 'Failed to load analytics')}
        </div>
      )}

      <div className='mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3'>
        {[
          { label: 'Revenue total', value: money(totals.revenue) },
          { label: 'Orders total', value: String(totals.orders) },
          { label: 'Average order', value: money(avgOrder) },
        ].map((tile) => (
          <dl key={tile.label} className={CARD}>
            <dt className='text-sm text-gray-600 dark:text-gray-400'>
              {tile.label}
            </dt>
            <dd className='mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white'>
              {q.isLoading ? '—' : tile.value}
            </dd>
            <dd className='mt-1 text-xs text-gray-400'>Last {days} days</dd>
          </dl>
        ))}
      </div>

      {asTable ? (
        <section className={`${CARD} mb-6 overflow-x-auto`}>
          <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
            Daily totals
          </h2>
          <table className='w-full min-w-[420px] text-sm'>
            <thead>
              <tr className='border-b border-gray-200 text-left text-gray-500 dark:border-gray-700'>
                <th scope='col' className='py-2 font-medium'>
                  Date
                </th>
                <th scope='col' className='py-2 text-right font-medium'>
                  Revenue
                </th>
                <th scope='col' className='py-2 text-right font-medium'>
                  Orders
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
              {series.map((p) => (
                <tr key={p.date}>
                  <td className='py-2 text-gray-700 dark:text-gray-300'>
                    {p.date}
                  </td>
                  <td className='py-2 text-right tabular-nums text-gray-900 dark:text-white'>
                    {money(p.revenue)}
                  </td>
                  <td className='py-2 text-right tabular-nums text-gray-900 dark:text-white'>
                    {p.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        // Revenue and orders are different scales, so they get a chart each
        // rather than a second y-axis.
        <div className='mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <section className={CARD}>
            <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
              Revenue
            </h2>
            <ResponsiveContainer width='100%' height={240}>
              <AreaChart data={series} margin={{ left: 4, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id='revFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={t.revenue} stopOpacity={0.24} />
                    <stop offset='100%' stopColor={t.revenue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={t.grid} vertical={false} />
                <XAxis {...axis} />
                <YAxis
                  tick={{ fill: t.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => money(v)}
                />
                <Tooltip
                  cursor={{ stroke: t.axis, strokeWidth: 1 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TooltipCard
                        label={String(label)}
                        rows={[
                          {
                            name: 'Revenue',
                            value: money(Number(payload[0].value)),
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
          </section>

          <section className={CARD}>
            <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
              Orders
            </h2>
            <ResponsiveContainer width='100%' height={240}>
              <LineChart data={series} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid stroke={t.grid} vertical={false} />
                <XAxis {...axis} />
                <YAxis
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
                        label={String(label)}
                        rows={[
                          { name: 'Orders', value: String(payload[0].value) },
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
          </section>
        </div>
      )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <section className={CARD}>
          <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
            Top products by revenue
          </h2>
          <LeaderChart
            rows={q.data?.topProducts ?? []}
            color={t.bar}
            emptyLabel='No paid orders in this range.'
          />
        </section>
        <section className={CARD}>
          <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
            Top brands by revenue
          </h2>
          <LeaderChart
            rows={q.data?.topBrands ?? []}
            color={t.barAlt}
            emptyLabel='No paid orders in this range.'
          />
        </section>
      </div>
    </motion.div>
  );
}
