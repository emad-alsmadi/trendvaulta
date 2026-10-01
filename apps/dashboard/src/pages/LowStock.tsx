import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useAdminLowStock } from '../hooks/useAdminStats';
import { useUpdateProductMutation } from '../hooks/useAdminCatalog';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { errorMessage, type LowStockProduct } from '../lib/api';
import { cleanVariant, variantLabel } from '../lib/variants';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/Card';
import { Table, TableCard, THead, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';

const THRESHOLDS = [5, 10, 25];

function StockBadge({ stock }: { stock: number }) {
  const { t, formatNumber } = useT();
  if (stock <= 0) {
    return (
      <StatusBadge status='out_of_stock'>
        {t('lowStock.outOfStock')}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge status='low_stock'>
      {t('lowStock.left', { count: formatNumber(stock) })}
    </StatusBadge>
  );
}

function RestockRow({
  product,
  threshold,
  canWrite,
  onDone,
}: {
  product: LowStockProduct;
  threshold: number;
  canWrite: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const { t, tv, formatCurrency, formatNumber } = useT();
  const updateMut = useUpdateProductMutation();
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  // Checkout sells from variant stock, so a variant product is restocked per
  // option (its total is kept as their sum) — never through `stock` alone.
  const lowIndexes = variants
    .map((v, i) => ((Number(v.stock) || 0) <= threshold ? i : -1))
    .filter((i) => i >= 0);
  const initial = (): Record<number, string> =>
    hasVariants
      ? Object.fromEntries(
          lowIndexes.map((i) => [i, String(variants[i].stock ?? 0)]),
        )
      : { [-1]: String(product.stock) };
  const [values, setValues] = useState<Record<number, string>>(initial);

  // Rows are keyed by id + updatedAt, so a refetch after a save (or a sale)
  // remounts with fresh values; this only tracks unsaved edits.
  const base = initial();
  const dirty = Object.keys(values).some((k) => values[+k] !== base[+k]);

  async function save() {
    const parsed = Object.entries(values).map(([k, raw]) => [+k, Number(raw)]);
    if (parsed.some(([, n]) => !Number.isInteger(n) || n < 0)) {
      toast.error(t('lowStock.invalid'));
      return;
    }
    const next = Object.fromEntries(parsed) as Record<number, number>;
    const payload = hasVariants
      ? (() => {
          const nextVariants = variants.map((v, i) =>
            cleanVariant(i in next ? { ...v, stock: next[i] } : v),
          );
          return {
            variants: nextVariants,
            stock: nextVariants.reduce((sum, v) => sum + v.stock, 0),
          };
        })()
      : { stock: next[-1] };
    try {
      await updateMut.mutateAsync({
        id: product._id,
        payload: { ...payload, expectedUpdatedAt: product.updatedAt },
      });
      toast.success(
        t('lowStock.updated', {
          title: product.title,
          stock: formatNumber(payload.stock),
        }),
      );
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, t('lowStock.updateFailed')));
    }
  }

  const stockInput = (key: number, label: string, text: string) => (
    <div
      key={key}
      className='flex items-center justify-end gap-2'
    >
      {text && (
        <span className='truncate text-xs text-muted-foreground'>{text}</span>
      )}
      <label
        className='sr-only'
        htmlFor={`stock-${product._id}-${key}`}
      >
        {label}
      </label>
      <input
        id={`stock-${product._id}-${key}`}
        type='number'
        min={0}
        value={values[key] ?? ''}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, [key]: e.target.value }))
        }
        className='w-20 rounded-control border border-border bg-background px-2 py-1.5 text-end text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      />
    </div>
  );

  return (
    <tr className='align-middle'>
      <Td>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted'>
            {product.cover && (
              <img
                src={product.cover}
                alt=''
                className='h-full w-full object-cover'
              />
            )}
          </div>
          <div className='min-w-0'>
            <p className='truncate font-medium text-foreground'>
              {product.title}
            </p>
            <p className='truncate text-xs text-muted-foreground'>
              {product.brand?.name || '—'}
              {product.sku ? ` · ${product.sku}` : ''}
            </p>
          </div>
        </div>
      </Td>
      <Td>
        {product.category ? tv('productCategory', product.category) : '—'}
      </Td>
      <Td>
        <StockBadge stock={product.stock} />
        {hasVariants && (
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('lowStock.optionsLow', {
              low: formatNumber(lowIndexes.length),
              total: formatNumber(variants.length),
            })}
          </p>
        )}
      </Td>
      <Td numeric>{formatCurrency(Number(product.price || 0))}</Td>
      <Td actions>
        {canWrite ? (
          <div className='flex items-end justify-end gap-2'>
            <div className='space-y-1'>
              {hasVariants
                ? lowIndexes.map((i) => {
                    const name =
                      variantLabel(variants[i]) ||
                      t('lowStock.option', { number: formatNumber(i + 1) });
                    return stockInput(
                      i,
                      t('lowStock.newStockForOption', {
                        title: product.title,
                        option: name,
                      }),
                      name,
                    );
                  })
                : stockInput(
                    -1,
                    t('lowStock.newStockFor', { title: product.title }),
                    '',
                  )}
            </div>
            <button
              type='button'
              onClick={() => void save()}
              disabled={!dirty || updateMut.isPending}
              className='rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200'
            >
              {updateMut.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        ) : (
          <p className='text-end text-xs text-muted-foreground'>
            {t('lowStock.readOnly')}
          </p>
        )}
      </Td>
    </tr>
  );
}

export default function LowStock() {
  const { can } = usePermissions();
  const { t, formatNumber } = useT();
  const [threshold, setThreshold] = useState(5);
  const q = useAdminLowStock(threshold);

  const products = q.data?.data ?? [];
  const outOfStock = products.filter((p) => p.stock <= 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title={t('lowStock.title')}
        description={t('lowStock.subtitle')}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <div className='inline-flex rounded-control border border-border p-0.5'>
              {THRESHOLDS.map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setThreshold(n)}
                  aria-pressed={threshold === n}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    threshold === n
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  ≤ {n}
                </button>
              ))}
            </div>
            <Button
              variant='secondary'
              onClick={() => void q.refetch()}
              icon={
                <RefreshCw
                  className={q.isFetching ? 'animate-spin' : ''}
                  aria-hidden
                />
              }
            >
              {t('lowStock.refresh')}
            </Button>
          </div>
        }
      />

      {q.isError && (
        <div className='mb-6 rounded-card border border-destructive bg-destructive/10 px-4 py-3 text-sm text-foreground'>
          {errorMessage(q.error, t('lowStock.loadFailed'))}
        </div>
      )}

      {!q.isError && (
        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <StatCard
            label={t('lowStock.needsRestock')}
            value={q.isLoading ? '—' : formatNumber(products.length)}
            className='bg-gradient-to-br from-metric-orange/5 to-metric-red/5 border-metric-orange/20'
          />
          <StatCard
            label={t('lowStock.outOfStock')}
            value={q.isLoading ? '—' : formatNumber(outOfStock)}
            className='bg-gradient-to-br from-metric-red/5 to-destructive/10 border-metric-red/20'
          />
        </div>
      )}

      <TableCard className='bg-gradient-to-br from-brand-cyan/5 to-brand-indigo/5 border-brand-cyan/10'>
        {q.isLoading ? (
          <p className='py-10 text-center text-sm text-muted-foreground'>
            {t('lowStock.loading')}
          </p>
        ) : products.length === 0 ? (
          <p className='py-10 text-center text-sm text-muted-foreground'>
            {t('lowStock.nothing', { threshold })}{' '}
            <Link
              to='/products'
              className='text-primary hover:underline'
            >
              {t('lowStock.browse')}
            </Link>
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('lowStock.columns.product')}</Th>
                <Th>{t('lowStock.columns.category')}</Th>
                <Th>{t('lowStock.columns.stock')}</Th>
                <Th numeric>{t('lowStock.columns.price')}</Th>
                <Th actions>{t('lowStock.columns.restock')}</Th>
              </tr>
            </THead>
            <tbody>
              {products.map((product) => (
                <RestockRow
                  key={`${product._id}:${product.updatedAt ?? ''}`}
                  product={product}
                  threshold={threshold}
                  canWrite={can('products:write')}
                  onDone={() => void q.refetch()}
                />
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>
    </motion.div>
  );
}
