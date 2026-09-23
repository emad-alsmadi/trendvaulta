'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Star, Eye } from 'lucide-react';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cartStore';
import type { Brand, Product } from '@/types';

export type ProductCardBadge = 'bestseller' | 'lowStock' | 'new';

export type ProductCardProduct = Pick<
  Product,
  | '_id'
  | 'title'
  | 'description'
  | 'price'
  | 'basePrice'
  | 'cover'
  | 'averageRating'
  | 'reviewCount'
  | 'category'
  | 'subcategory'
  | 'brand'
  | 'stock'
>;

interface ProductCardProps {
  product: ProductCardProduct;
  /** Merchandising flags — from Product.badges (API) */
  badges?: ProductCardBadge[];
}

function getBrandMeta(brand: Product['brand']): Brand | null {
  if (!brand || typeof brand === 'string') return null;
  return brand;
}

export function ProductCard({ product, badges = [] }: ProductCardProps) {
  const cart = useCart();
  const brand = getBrandMeta(product.brand);

  const handleAddToCart = () => {
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: product.price,
      cover: product.cover,
      qty: 1,
      maxQty: typeof product.stock === 'number' ? product.stock : undefined,
    });
  };

  const discount =
    product.basePrice > product.price
      ? Math.round(
          ((product.basePrice - product.price) / product.basePrice) * 100,
        )
      : 0;

  const inStock = product.stock !== undefined ? product.stock > 0 : true;
  const lowStock =
    badges.includes('lowStock') ||
    (product.stock !== undefined && product.stock > 0 && product.stock <= 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className='bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group w-full border border-gray-100'
    >
      <Link href={`/products/${product._id}`}>
        <div className='relative aspect-square overflow-hidden bg-gray-100'>
          <Image
            src={product.cover}
            alt={product.title}
            fill
            className='object-cover group-hover:scale-105 transition-transform duration-300'
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
          />
          <div className='absolute top-2 start-2 flex flex-col gap-1 items-start'>
            {discount > 0 && (
              <span className='bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm'>
                -{discount}%
              </span>
            )}
            {badges.includes('bestseller') && (
              <span className='bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm'>
                Bestseller
              </span>
            )}
            {badges.includes('new') && (
              <span className='bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm'>
                New
              </span>
            )}
          </div>
          {!inStock && (
            <div className='absolute top-2 end-2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm'>
              Out of Stock
            </div>
          )}
          {inStock && lowStock && (
            <div className='absolute top-2 end-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm'>
              Low stock
            </div>
          )}

          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2'>
            <Button
              size='sm'
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart();
              }}
              disabled={!inStock}
              className='bg-white text-gray-900 hover:bg-gray-100 shadow-lg'
            >
              <ShoppingCart className='h-4 w-4 me-1' />
              Add to Cart
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='bg-white/90 hover:bg-white shadow-lg'
            >
              <Eye className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </Link>

      <div className='p-4'>
        {brand && (
          <Link
            href={`/brands/${brand._id || brand.slug}`}
            className='text-xs text-gray-500 hover:text-fuchsia-600 transition-colors mb-1 block font-medium'
          >
            {brand.name}
          </Link>
        )}

        <Link href={`/products/${product._id}`}>
          <h3 className='font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-fuchsia-600 transition-colors text-sm leading-relaxed'>
            {product.title}
          </h3>
        </Link>

        <div className='flex items-center gap-2 mb-3'>
          <div className='flex items-center'>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.floor(product.averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className='text-xs text-gray-500'>
            ({product.reviewCount || 0})
          </span>
        </div>

        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <span className='text-xl font-bold text-gray-900'>
              ${product.price.toFixed(2)}
            </span>
            {discount > 0 && (
              <span className='text-sm text-gray-400 line-through'>
                ${product.basePrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            onClick={handleAddToCart}
            disabled={!inStock}
            className='flex-1 gap-1'
          >
            <ShoppingCart className='h-4 w-4' />
            Add
          </Button>
          <WishlistButton
            productId={product._id}
            variant='icon'
            tone='onLight'
            className='h-9 w-9 shrink-0 rounded-md border border-stone-200 !p-0 [&>svg]:mx-auto [&>svg]:h-4 [&>svg]:w-4'
          />
        </div>
      </div>
    </motion.div>
  );
}
