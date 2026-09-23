import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, PackageX, RefreshCw } from 'lucide-react';
import { useAdminLowStock } from '../hooks/useAdminStats';
import { useUpdateProductMutation } from '../hooks/useAdminCatalog';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { errorMessage, type LowStockProduct } from '../lib/api';

const THRESHOLDS = [5, 10, 25];

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300'>
        <PackageX className='h-3 w-3' />
        Out of stock
      </span>
    );
  }
  return (
    <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'>
      <AlertTriangle className='h-3 w-3' />
      {stock} left
    </span>
  );
}

function RestockRow({
  product,
  canWrite,
  onDone,
}: {
  product: LowStockProduct;
  canWrite: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const updateMut = useUpdateProductMutation();
  const [value, setValue] = useState(String(product.stock));

  // The row is keyed by product id, so remounting after a refetch resets the
  // input; only a stale in-place value needs guarding against.
  const dirty = value !== String(product.stock);

  async function save() {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) {
      toast.error('Stock must be a whole number of 0 or more.');
      return;
    }
    try {
      await updateMut.mutateAsync({ id: product._id, payload: { stock } });
      toast.success(`${product.title} set to ${stock} in stock.`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update stock'));
    }
  }

  return (
    <tr className='align-middle'>
      <td className='py-3 pr-3'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700'>
            {product.cover && (
              <img src={product.cover} alt='' className='h-full w-full object-cover' />
            )}
          </div>
          <div className='min-w-0'>
            <p className='truncate font-medium text-gray-900 dark:text-white'>
              {product.title}
            </p>
            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
              {product.brand?.name || '—'}
              {product.sku ? ` · ${product.sku}` : ''}
            </p>
          </div>
        </div>
      </td>
      <td className='py-3 pr-3 text-sm text-gray-600 dark:text-gray-400'>
        {product.category || '—'}
      </td>
      <td className='py-3 pr-3'>
        <StockBadge stock={product.stock} />
      </td>
      <td className='py-3 pr-3 text-right text-sm tabular-nums text-gray-900 dark:text-white'>
        ${Number(product.price || 0).toFixed(2)}
      </td>
      <td className='py-3'>
        {canWrite ? (
          <div className='flex items-center justify-end gap-2'>
            <label className='sr-only' htmlFor={`stock-${product._id}`}>
              New stock for {product.title}
            </label>
            <input
              id={`stock-${product._id}`}
              type='number'
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className='w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
            />
            <button
              type='button'
              onClick={() => void save()}
              disabled={!dirty || updateMut.isPending}
              className='rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {updateMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <p className='text-right text-xs text-gray-400'>Read only</p>
        )}
      </td>
    </tr>
  );
}

export default function LowStock() {
  const { can } = usePermissions();
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
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Low stock
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Active products at or below the threshold, most urgent first.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600'>
            {THRESHOLDS.map((n) => (
              <button
                key={n}
                type='button'
                onClick={() => setThreshold(n)}
                aria-pressed={threshold === n}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  threshold === n
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                ≤ {n}
              </button>
            ))}
          </div>
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
          {errorMessage(q.error, 'Failed to load low stock products')}
        </div>
      )}

      {!q.isError && (
        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Needs restocking
            </p>
            <p className='mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white'>
              {q.isLoading ? '—' : products.length}
            </p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Out of stock
            </p>
            <p className='mt-1 text-3xl font-bold tabular-nums text-red-600 dark:text-red-400'>
              {q.isLoading ? '—' : outOfStock}
            </p>
          </div>
        </div>
      )}

      <section className='overflow-x-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
        {q.isLoading ? (
          <p className='py-10 text-center text-sm text-gray-500'>Loading…</p>
        ) : products.length === 0 ? (
          <p className='py-10 text-center text-sm text-gray-500'>
            Nothing at or below {threshold} in stock.{' '}
            <Link to='/products' className='text-blue-600 hover:underline'>
              Browse the catalog
            </Link>
          </p>
        ) : (
          <table className='w-full min-w-[640px] text-sm'>
            <thead>
              <tr className='border-b border-gray-200 text-left text-gray-500 dark:border-gray-700'>
                <th scope='col' className='pb-2 font-medium'>
                  Product
                </th>
                <th scope='col' className='pb-2 font-medium'>
                  Category
                </th>
                <th scope='col' className='pb-2 font-medium'>
                  Stock
                </th>
                <th scope='col' className='pb-2 text-right font-medium'>
                  Price
                </th>
                <th scope='col' className='pb-2 text-right font-medium'>
                  Restock
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
              {products.map((product) => (
                <RestockRow
                  key={product._id}
                  product={product}
                  canWrite={can('products:write')}
                  onDone={() => void q.refetch()}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </motion.div>
  );
}
