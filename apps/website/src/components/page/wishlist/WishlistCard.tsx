import Image from 'next/image';
import Link from 'next/link';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { WishlistItem } from '@/types';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';

interface WishlistCardProps {
  item: WishlistItem;
}

export function WishlistCard({ item }: WishlistCardProps) {
  const { t, formatPrice } = useTranslation();
  const product = item.product;
  if (!product) return null;
  // A bare string is an unpopulated ObjectId — never show that as a name.
  const brandName =
    product.brand && typeof product.brand === 'object'
      ? product.brand.name
      : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className='group flex h-full flex-col'
    >
      {/* The wishlist button is a sibling of the link, not a child. */}
      <div className='relative'>
        <Link
          href={`/products/${product._id}`}
          className='relative block aspect-square overflow-hidden rounded-card bg-surface-muted'
        >
          <Image
            loader={remoteCoverLoader}
            src={normalizeRemoteImageSrc(product.cover)}
            alt={product.title}
            fill
            className='object-cover transition-transform duration-(--dur-slow) ease-brand group-hover:scale-[1.04]'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        </Link>
        <WishlistButton
          productId={product._id}
          variant='icon'
          tone='onLight'
          className='absolute end-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center bg-surface/90 !p-0 shadow-soft [&>svg]:h-4 [&>svg]:w-4'
        />
      </div>

      <div className='flex flex-1 flex-col pt-3'>
        {brandName && (
          <p className='mb-1 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted rtl:tracking-normal'>
            {brandName}
          </p>
        )}
        <Link href={`/products/${product._id}`}>
          <h3 className='line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors hover:text-accent'>
            {product.title}
          </h3>
        </Link>
        <p className='mt-2 text-base font-semibold tabular-nums text-ink'>
          {formatPrice(product.price)}
        </p>
        <div className='mt-auto pt-3'>
          <Link
            href={`/products/${product._id}`}
            className='inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors duration-(--dur-fast) hover:bg-stone-800'
          >
            {t('wishlist.viewDetails')}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
