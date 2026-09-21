'use client';

import { use, useEffect, useState } from 'react';
import { useProductById } from '@/hooks/products/productsQuery';
import { motion } from 'framer-motion';
import {
  Loader2,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useCart, formatVariantLabel } from '@/lib/cartStore';
import { FrequentlyBoughtTogether } from '@/components/products/FrequentlyBoughtTogether';
import { ProductQaSection } from '@/components/products/ProductQaSection';
import { trackRecentlyViewed } from '@/lib/recentlyViewed';
import type { ProductVariant } from '@/types';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProductById(id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const cart = useCart();

  // DEMO: local recently viewed — TODO(api): POST /api/me/recently-viewed
  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed({
      id: product._id,
      title: product.title,
      cover: product.cover,
      price: product.price,
      category: product.category,
    });
  }, [product]);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin text-fuchsia-600 mx-auto' />
          <p className='mt-4 text-gray-600'>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>Product not found</div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.cover];
  const discount =
    product.basePrice > product.price
      ? Math.round(
          ((product.basePrice - product.price) / product.basePrice) * 100,
        )
      : 0;

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const variantRequired = hasVariants && !selectedVariant;
  // Per-variant price/stock; fall back to product-level values.
  const unitPrice = selectedVariant?.price ?? product.price;
  const availableStock =
    hasVariants && selectedVariant
      ? (selectedVariant.stock ?? product.stock)
      : product.stock;
  const outOfStock = availableStock <= 0;
  const maxQty = Math.max(0, Math.floor(availableStock));
  const atMax = maxQty > 0 && quantity >= maxQty;
  const canPurchase = !variantRequired && !outOfStock;

  const handleAddToCart = () => {
    if (!canPurchase) return false;
    const variant = selectedVariant
      ? {
          size: selectedVariant.size,
          color: selectedVariant.color,
          colorCode: selectedVariant.colorCode,
          sku: selectedVariant.sku,
        }
      : undefined;
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: unitPrice,
      cover: product.cover,
      qty: Math.min(quantity, maxQty),
      variant,
      maxQty,
    });
    return true;
  };

  const handleBuyNow = () => {
    if (!handleAddToCart()) return;
    window.location.href = '/checkout';
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    const stock = variant.stock ?? product.stock;
    if (stock > 0 && quantity > stock) setQuantity(stock);
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Breadcrumb */}
      <div className='bg-white border-b'>
        <div className='container mx-auto px-4 py-3'>
          <nav className='flex items-center gap-2 text-sm text-gray-600'>
            <Link
              href='/'
              className='hover:text-fuchsia-600'
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href='/products'
              className='hover:text-fuchsia-600'
            >
              Products
            </Link>
            <span>/</span>
            {product.brand && typeof product.brand === 'object' && (
              <>
                <Link
                  href={`/brands/${product.brand._id}`}
                  className='hover:text-fuchsia-600'
                >
                  {product.brand.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className='text-gray-900 truncate max-w-xs'>
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='space-y-4'
          >
            <div className='relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg'>
              <img
                src={images[selectedImage]}
                alt={product.title}
                className='w-full h-full object-cover'
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className='absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors'
                  >
                    <ChevronLeft className='h-5 w-5' />
                  </button>
                  <button
                    onClick={nextImage}
                    className='absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors'
                  >
                    <ChevronRight className='h-5 w-5' />
                  </button>
                </>
              )}
              {discount > 0 && (
                <div className='absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full'>
                  -{discount}% OFF
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className='flex gap-3 overflow-x-auto pb-2'>
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx
                        ? 'border-fuchsia-600 ring-2 ring-fuchsia-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} view ${idx + 1}`}
                      className='w-full h-full object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className='space-y-6'
          >
            {/* Brand */}
            {product.brand && typeof product.brand === 'object' && (
              <Link
                href={`/brands/${product.brand._id}`}
                className='inline-flex items-center gap-2 text-fuchsia-600 hover:text-fuchsia-700 font-medium'
              >
                {product.brand.logo && (
                  <img
                    src={product.brand.logo}
                    alt={product.brand.name}
                    className='w-6 h-6 object-contain'
                  />
                )}
                {product.brand.name}
              </Link>
            )}

            {/* Title */}
            <h1 className='text-3xl font-bold text-gray-900'>
              {product.title}
            </h1>

            {/* Rating */}
            <div className='flex items-center gap-2'>
              <div className='flex items-center'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className='text-gray-600'>
                {product.averageRating?.toFixed(1) || '0.0'}
              </span>
              <span className='text-gray-400'>|</span>
              <span className='text-gray-600'>
                {product.reviewCount || 0} reviews
              </span>
            </div>

            {/* Price */}
            <div className='flex items-baseline gap-3'>
              <span className='text-4xl font-bold text-gray-900'>
                ${unitPrice.toFixed(2)}
              </span>
              {discount > 0 && (
                <>
                  <span className='text-xl text-gray-400 line-through'>
                    ${product.basePrice?.toFixed(2)}
                  </span>
                  <span className='text-sm font-semibold text-green-600'>
                    Save ${(product.basePrice - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className='text-gray-700 leading-relaxed'>
              {product.description}
            </p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className='space-y-3'>
                <h3 className='font-semibold text-gray-900'>
                  Options{' '}
                  <span className='font-normal text-gray-500'>(required)</span>
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {product.variants.map((variant, idx) => {
                    const stock = variant.stock ?? product.stock;
                    const soldOut = stock <= 0;
                    const label =
                      [variant.size, variant.color].filter(Boolean).join(' / ') ||
                      `Option ${idx + 1}`;
                    return (
                      <button
                        key={variant.sku || `${variant.size}-${variant.color}-${idx}`}
                        type='button'
                        onClick={() => handleSelectVariant(variant)}
                        disabled={soldOut}
                        aria-pressed={selectedVariant === variant}
                        className={`px-4 py-2 border rounded-lg text-left transition-all ${
                          selectedVariant === variant
                            ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${soldOut ? 'cursor-not-allowed opacity-50 line-through' : ''}`}
                      >
                        <span className='block text-sm font-semibold'>{label}</span>
                        <span className='block text-xs text-gray-500'>
                          ${(variant.price ?? product.price).toFixed(2)}
                          {soldOut
                            ? ' · Out of stock'
                            : stock <= 5
                              ? ` · Only ${stock} left`
                              : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {variantRequired ? (
                  <p className='text-sm text-gray-600'>
                    Please choose an option to continue.
                  </p>
                ) : selectedVariant ? (
                  <p className='text-sm text-gray-600'>
                    Selected: {formatVariantLabel(selectedVariant) || 'Option'}
                  </p>
                ) : null}
              </div>
            )}

            {/* Quantity */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-gray-900'>Quantity</h3>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label='Decrease quantity'
                  className='w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Minus className='h-4 w-4' />
                </button>
                <span className='w-12 text-center font-semibold'>
                  {quantity}
                </span>
                <button
                  type='button'
                  onClick={() =>
                    setQuantity(
                      maxQty > 0 ? Math.min(maxQty, quantity + 1) : quantity + 1,
                    )
                  }
                  disabled={outOfStock || atMax}
                  aria-label='Increase quantity'
                  className='w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Plus className='h-4 w-4' />
                </button>
                <span className='text-sm text-gray-600'>
                  {variantRequired
                    ? 'Choose an option to see availability'
                    : outOfStock
                      ? 'Out of stock'
                      : atMax
                        ? `Max ${maxQty}`
                        : availableStock <= 5
                          ? `Only ${availableStock} left`
                          : `${availableStock} in stock`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className='flex gap-4'>
              <Button
                size='lg'
                onClick={() => void handleAddToCart()}
                disabled={!canPurchase}
                title={variantRequired ? 'Choose an option first' : undefined}
                className='flex-1 gap-2'
              >
                <ShoppingCart className='h-5 w-5' />
                Add to Cart
              </Button>
              <Button
                size='lg'
                variant='outline'
                onClick={handleBuyNow}
                disabled={!canPurchase}
                title={variantRequired ? 'Choose an option first' : undefined}
                className='flex-1'
              >
                Buy Now
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='px-4'
              >
                <Heart className='h-5 w-5' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='px-4'
              >
                <Share2 className='h-5 w-5' />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t'>
              <div className='text-center'>
                <Truck className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>Free Shipping</p>
              </div>
              <div className='text-center'>
                <Shield className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>Secure Payment</p>
              </div>
              <div className='text-center'>
                <RotateCcw className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>Easy Returns</p>
              </div>
            </div>
          </motion.div>
        </div>

        <FrequentlyBoughtTogether
          primary={{
            _id: product._id,
            title: product.title,
            price: product.price,
            cover: product.cover,
            category: product.category,
            stock: product.stock,
          }}
        />

        {/* Product Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-white rounded-2xl shadow-sm p-8 mb-8'
        >
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>
            Product Details
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {product.material && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Material</h3>
                <p className='text-gray-700'>{product.material}</p>
              </div>
            )}
            {product.weight && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Weight</h3>
                <p className='text-gray-700'>{product.weight}</p>
              </div>
            )}
            {product.dimensions && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Dimensions</h3>
                <p className='text-gray-700'>
                  {product.dimensions.length && `${product.dimensions.length}L`}
                  {product.dimensions.width &&
                    ` x ${product.dimensions.width}W`}
                  {product.dimensions.height &&
                    ` x ${product.dimensions.height}H`}
                </p>
              </div>
            )}
            {product.sku && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>SKU</h3>
                <p className='text-gray-700'>{product.sku}</p>
              </div>
            )}
            {product.shippingInfo && (
              <div className='md:col-span-2'>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  Shipping Information
                </h3>
                <p className='text-gray-700'>{product.shippingInfo}</p>
              </div>
            )}
          </div>
        </motion.div>

        <ProductQaSection category={product.category} />

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-white rounded-2xl shadow-sm p-8 mb-8'
        >
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>
            Customer Reviews
          </h2>
          <div className='flex items-center gap-4 mb-6'>
            <div className='text-5xl font-bold text-gray-900'>
              {product.averageRating?.toFixed(1) || '0.0'}
            </div>
            <div>
              <div className='flex items-center mb-1'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className='text-gray-600'>
                {product.reviewCount || 0} reviews
              </p>
            </div>
          </div>
          <p className='text-gray-600'>
            No reviews yet. Be the first to review this product!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
