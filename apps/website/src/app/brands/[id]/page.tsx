'use client';

import { useBrandById } from '@/hooks/brands/brandsQuery';
import { useProducts } from '@/hooks/products/productsQuery';
import { motion } from 'framer-motion';
import { Loader2, Star, Globe, MapPin, ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/products/ProductCard';
import Link from 'next/link';
import { useCart } from '@/lib/cartStore';

export default function BrandDetailPage({ params }: { params: { id: string } }) {
  const { data: brand, isLoading: brandLoading, error: brandError } = useBrandById(params.id);
  const { data: productsResponse, isLoading: productsLoading } = useProducts({
    brand: params.id,
    limit: 12,
    sort: 'createdAt',
  });
  const products = productsResponse?.data || [];
  const cart = useCart();

  if (brandLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin text-fuchsia-600 mx-auto' />
          <p className='mt-4 text-gray-600'>Loading brand...</p>
        </div>
      </div>
    );
  }

  if (brandError || !brand) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>
          Brand not found
        </div>
      </div>
    );
  }

  const handleAddToCart = (product: any) => {
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: product.price,
      cover: product.cover,
      qty: 1,
    });
  };

  return (
    <div className='min-h-screen bg-white'>
      {/* Brand Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 text-white'
      >
        <div className='container mx-auto px-4 py-16'>
          <div className='flex flex-col md:flex-row items-center gap-8'>
            {brand.logo && (
              <div className='w-32 h-32 bg-white rounded-2xl p-4 shadow-xl'>
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className='w-full h-full object-contain'
                />
              </div>
            )}
            <div className='flex-1 text-center md:text-left'>
              <h1 className='text-4xl md:text-5xl font-bold mb-4'>{brand.name}</h1>
              {brand.country && (
                <div className='flex items-center justify-center md:justify-start gap-2 mb-3'>
                  <MapPin className='h-5 w-5' />
                  <span className='text-lg'>{brand.country}</span>
                </div>
              )}
              {brand.website && (
                <a
                  href={brand.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors'
                >
                  <Globe className='h-4 w-4' />
                  Visit Official Website
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className='container mx-auto px-4 py-12'>
        {/* Brand Description */}
        {brand.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-8 shadow-lg mb-8'
          >
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>About {brand.name}</h2>
            <p className='text-gray-700 leading-relaxed'>{brand.description}</p>
          </motion.div>
        )}

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-3xl font-bold text-gray-900'>
              Products from {brand.name}
            </h2>
            <span className='text-gray-600'>{products.length} products</span>
          </div>

          {productsLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
            </div>
          ) : products.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {products.map((product: any) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className='text-center py-12 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30'>
              <p className='text-gray-600 text-lg'>No products available from this brand yet.</p>
            </div>
          )}
        </motion.div>

        {/* Trust Elements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='mt-12 grid grid-cols-1 md:grid-cols-3 gap-6'
        >
          <div className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 text-center shadow-lg'>
            <div className='w-12 h-12 bg-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <ShoppingCart className='h-6 w-6 text-fuchsia-600' />
            </div>
            <h3 className='font-semibold text-gray-900 mb-2'>Secure Checkout</h3>
            <p className='text-sm text-gray-600'>Safe and encrypted payment processing</p>
          </div>
          <div className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 text-center shadow-lg'>
            <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Heart className='h-6 w-6 text-purple-600' />
            </div>
            <h3 className='font-semibold text-gray-900 mb-2'>Authentic Products</h3>
            <p className='text-sm text-gray-600'>100% genuine {brand.name} products</p>
          </div>
          <div className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 text-center shadow-lg'>
            <div className='w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Star className='h-6 w-6 text-cyan-600' />
            </div>
            <h3 className='font-semibold text-gray-900 mb-2'>Customer Reviews</h3>
            <p className='text-sm text-gray-600'>Verified customer feedback</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
