'use client';

import Link from 'next/link';
import { ShoppingCart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cartStore';

interface ProductCardProps {
  product: {
    _id: string;
    title: string;
    description: string;
    price: number;
    basePrice: number;
    cover: string;
    averageRating: number;
    reviewCount: number;
    category: string;
    subcategory?: string;
    brand?: {
      name: string;
      slug: string;
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const cart = useCart();

  const handleAddToCart = () => {
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: product.price,
      cover: product.cover,
      qty: 1,
    });
  };

  const discount =
    product.basePrice > product.price
      ? Math.round(
          ((product.basePrice - product.price) / product.basePrice) * 100,
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className='bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group w-full'
    >
      <Link href={`/products/${product._id}`}>
        <div className='relative aspect-square overflow-hidden bg-gray-100'>
          <img
            src={product.cover}
            alt={product.title}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
          />
          {discount > 0 && (
            <div className='absolute top-2 left-2 bg-linear-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full'>
              -{discount}%
            </div>
          )}
        </div>
      </Link>

      <div className='p-3'>
        {product.brand && (
          <Link
            href={`/brands/${product.brand.slug}`}
            className='text-xs text-gray-500 hover:text-fuchsia-600 transition-colors mb-1 block'
          >
            {product.brand.name}
          </Link>
        )}

        <Link href={`/products/${product._id}`}>
          <h3 className='font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-fuchsia-600 transition-colors'>
            {product.title}
          </h3>
        </Link>

        <div className='flex items-center gap-1 mb-2'>
          <div className='flex items-center'>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(product.averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className='text-xs text-gray-500'>({product.reviewCount})</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-lg font-bold text-gray-900'>
              ${product.price.toFixed(2)}
            </span>
            {discount > 0 && (
              <span className='text-sm text-gray-400 line-through'>
                ${product.basePrice.toFixed(2)}
              </span>
            )}
          </div>

          <Button
            size='sm'
            onClick={handleAddToCart}
            className='gap-1'
          >
            <ShoppingCart className='h-4 w-4' />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
