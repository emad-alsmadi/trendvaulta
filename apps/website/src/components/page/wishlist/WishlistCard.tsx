import Image from 'next/image';
import Link from 'next/link';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { WishlistItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { motion } from 'framer-motion';

interface WishlistCardProps {
  item: WishlistItem;
}

export function WishlistCard({ item }: WishlistCardProps) {
  const product = item.product;
  if (!product) return null;
  const brandName =
    typeof product.brand === 'string' ? product.brand : product.brand.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='group relative rounded-3xl bg-gradient-to-br from-amber-500/25 via-fuchsia-500/20 to-cyan-500/25 p-[1px]'
    >
      <div className='relative h-full rounded-3xl border border-white/40 bg-white/45 p-4 shadow-sm backdrop-blur-xl'>
        <div className='relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white/30'>
          <Link href={`/products/${product._id}`}>
            <Image
              loader={remoteCoverLoader}
              src={normalizeRemoteImageSrc(product.cover)}
              alt={product.title}
              fill
              className='object-cover transition-transform duration-500 group-hover:scale-110'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
          </Link>
          <div className='absolute top-3 end-3'>
            <WishlistButton
              productId={product._id}
              variant='icon'
              className='bg-white/90 text-indigo-950 hover:bg-white'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Link href={`/products/${product._id}`}>
            <h3 className='line-clamp-2 text-base font-extrabold tracking-tight text-indigo-950 hover:text-indigo-700 transition-colors'>
              {product.title}
            </h3>
          </Link>
          <p className='text-xs font-extrabold text-indigo-900/80'>
            by {brandName}
          </p>
          <div className='flex items-center justify-between'>
            <p className='text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700'>
              ${product.price.toFixed(2)}
            </p>
          </div>
          <div className='flex gap-2'>
            <Link
              href={`/products/${product._id}`}
              className='flex-1'
            >
              <Button className='w-full'>View Details</Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
