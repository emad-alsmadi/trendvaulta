import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PackageCheck, PackageX, RefreshCw } from 'lucide-react';
import { useAdminLowStock } from '../hooks/useAdminStats';
import { useUpdateProductMutation } from '../hooks/useAdminCatalog';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { errorMessage, type LowStockProduct } from '../lib/api';
import { cleanVariant, variantLabel } from '../lib/variants';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/Card';
import {
  Table,
  TableCard,
  THead,
  Th,
  Td,
  Thumbnail,
} from '../components/ui/Table';
import { Input } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { buttonVariants, focusRing } from '../components/ui/styles';
import { cn } from '../lib/cn';

const THRESHOLDS = [5, 10, 25];

function StockBadge({ stock }: { stock: number }) {
  const { t, formatNumber } = useT();
  if (stock <= 0) {
    return (
      <StatusBadge status='out_of_stock'>{t('lowStock.outOfStock')}</StatusBadge>
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
        <span className='max-w-[8rem] truncate text-xs text-muted-foreground'>
          {text}
        </span>
      )}
      <label
        className='sr-only'
        htmlFor={`stock-${product._id}-${key}`}
      >
        {label}
      </label>
      <Input
        id={`stock-${product._id}-${key}`}
        type='number'
        min={0}
        value={values[key] ?? ''}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, [key]: e.target.value }))
        }
        className='h-control-sm w-20 text-end tabular-nums'
      />
    </div>
  );

  return (
    <tr className='border-b border-border transition-colors duration-fast last:border-0 hover:bg-muted/50'>
      <Td>
        <div className='flex items-center gap-3'>
          <Thumbnail src={product.cover} />
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
      <Td className='text-muted-foreground'>
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
            {/* The row's only button: the tests (and keyboard users) reach it first. */}
            <Button
              size='sm'
              variant='primary'
              onClick={() => void save()}
              disabled={!dirty}
              loading={updateMut.isPending}
            >
              {t('common.save')}
            </Button>
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
    <>
      <PageHeader
        title={t('lowStock.title')}
        description={t('lowStock.subtitle')}
        actions={
          <>
            <div className='inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-muted p-0.5'>
              {THRESHOLDS.map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setThreshold(n)}
                  aria-pressed={threshold === n}
                  className={cn(
                    'inline-flex h-full items-center rounded px-3 text-body-sm font-medium tabular-nums transition-colors duration-fast',
                    focusRing,
                    threshold === n
                      ? 'border border-border bg-background text-foreground shadow-card'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  ≤ {n}
                </button>
              ))}
            </div>
            <Button
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
          </>
        }
      />

      {q.isError && (
        <Alert
          tone='error'
          className='mb-6'
        >
          {errorMessage(q.error, t('lowStock.loadFailed'))}
        </Alert>
      )}

      {!q.isError && (
        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <StatCard
            label={t('lowStock.needsRestock')}
            value={q.isLoading ? '—' : formatNumber(products.length)}
            icon={<AlertTriangle />}
          />
          <StatCard
            label={t('lowStock.outOfStock')}
            value={q.isLoading ? '—' : formatNumber(outOfStock)}
            icon={<PackageX />}
          />
        </div>
      )}

      <TableCard>
        {q.isLoading ? (
          <div
            className='divide-y divide-border'
            aria-label={t('lowStock.loading')}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center gap-4 px-4 py-3'
              >
                <Skeleton variant='thumbnail' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='w-1/3' />
                  <Skeleton className='w-1/5' />
                </div>
                <Skeleton
                  variant='custom'
                  className='h-8 w-28 rounded-control'
                />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageCheck aria-hidden />}
            title={t('lowStock.nothing', { threshold })}
            action={
              <Link
                to='/products'
                className={buttonVariants({ size: 'sm' })}
              >
                {t('lowStock.browse')}
              </Link>
            }
          />
        ) : (
          <Table className='min-w-[760px]'>
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
    </>
  );
}
