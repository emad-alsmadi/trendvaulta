'use client';

import { useParams, useRouter } from 'next/navigation';
import { Template } from '@/types';
import { Button } from '@/components/ui/Button';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { StarRating } from '@/components/page/rating/StarRating';
import { ReviewForm } from '@/components/page/review/ReviewForm';
import { ReviewList } from '@/components/page/review/ReviewList';
import { useToast } from '@/components/ui/Toast';
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  User,
  Globe,
  Calendar,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTemplateById } from '@/hooks/templates/templatesQuery';
import { useCart } from '@/lib/cartStore';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { useState } from 'react';
import {
  useTemplateReviews,
  useMyReview,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from '@/hooks/reviews/reviewsQuery';
import { getAuthToken } from '@/lib/authCookies';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const cart = useCart();

  const id = params.id as string | undefined;
  const templateQuery = useTemplateById(id);
  const template: Template | null = templateQuery.data || null;
  const loading = templateQuery.isLoading;
  const error = (templateQuery.error as any)?.message || null;

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);

  // Review queries and mutations
  const reviewsQuery = useTemplateReviews(id || '');
  const myReviewQuery = useMyReview(id || '');
  const createReviewMutation = useCreateReviewMutation();
  const updateReviewMutation = useUpdateReviewMutation();
  const deleteReviewMutation = useDeleteReviewMutation();

  const reviews = reviewsQuery.data || [];
  const myReview = myReviewQuery.data || null;
  const token = getAuthToken();

  if (loading) {
    return (
      <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12 shadow-sm backdrop-blur-xl'>
        <Loader2 className='h-7 w-7 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className='space-y-4'>
        <Link
          href='/'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Templates
        </Link>
        <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
          <div className='text-lg font-extrabold'>Template Not Found</div>
          <div className='mt-2 text-sm font-semibold'>
            {error || "Sorry, we couldn't find this template."}
          </div>
        </div>
      </div>
    );
  }

  const creatorName =
    typeof template.author === 'string'
      ? template.author
      : template.author.name;
  const creatorCountry =
    typeof template.author === 'string'
      ? null
      : template.author.country || null;
  const creatorBio =
    typeof template.author === 'string' ? null : template.author.bio || null;

  const handleAddToCart = () => {
    cart.addToCart({
      templateId: template._id,
      title: template.title,
      price: template.price,
      cover: normalizeRemoteImageSrc(template.cover),
      qty: 1,
    });
    toast('Added to cart.', {
      title: 'Cart',
      variant: 'success',
    });
  };

  const handleCreateReview = async (data: any) => {
    try {
      await createReviewMutation.mutateAsync(data);
      toast('Review submitted successfully!', {
        title: 'Success',
        variant: 'success',
      });
      setShowReviewForm(false);
    } catch (error) {
      toast('Failed to submit review. Please try again.', {
        title: 'Error',
        variant: 'error',
      });
    }
  };

  const handleUpdateReview = async (data: any) => {
    try {
      await updateReviewMutation.mutateAsync({
        reviewId: editingReview._id,
        payload: data,
      });
      toast('Review updated successfully!', {
        title: 'Success',
        variant: 'success',
      });
      setEditingReview(null);
      setShowReviewForm(false);
    } catch (error) {
      toast('Failed to update review. Please try again.', {
        title: 'Error',
        variant: 'error',
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewMutation.mutateAsync({
        reviewId,
        templateId: template._id,
      });
      toast('Review deleted successfully!', {
        title: 'Success',
        variant: 'success',
      });
    } catch (error) {
      toast('Failed to delete review. Please try again.', {
        title: 'Error',
        variant: 'error',
      });
    }
  };

  return (
    <div className='relative overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, 9, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(99,102,241,0.22), transparent 70%), radial-gradient(closest-side, rgba(236,72,153,0.20), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)',
        }}
      />

      <div className='relative mx-auto max-w-6xl space-y-6'>
        <Link
          href='/'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Templates
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'
        >
          <div className='space-y-4'>
            <div className='rounded-3xl border border-white/30 bg-white/30 p-3 backdrop-blur-xl'>
              <motion.div
                className='relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white/20'
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <Image
                  loader={remoteCoverLoader}
                  src={normalizeRemoteImageSrc(template.cover)}
                  alt={template.title}
                  fill
                  className='object-cover'
                  sizes='(max-width: 1024px) 100vw, 45vw'
                  priority
                />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent' />
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className='absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white backdrop-blur'
                >
                  <Sparkles className='h-4 w-4' />
                  Featured
                </motion.div>
                <div className='absolute right-4 top-4'>
                  <WishlistButton
                    templateId={template._id}
                    variant='icon'
                    className='bg-white/90 text-indigo-950 hover:bg-white'
                  />
                </div>
              </motion.div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-3xl border border-white/30 bg-white/30 p-5'>
                <div className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                  <Calendar className='h-4 w-4 text-indigo-700' />
                  Updated
                </div>
                <div className='mt-2 text-sm font-extrabold text-indigo-950'>
                  {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className='rounded-3xl border border-white/30 bg-white/30 p-5'>
                <div className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                  <Tag className='h-4 w-4 text-fuchsia-700' />
                  Price
                </div>
                <div className='mt-2 text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700'>
                  ${template.price.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'>
              <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
                <User className='h-4 w-4 text-cyan-700' />
                {creatorName}
              </div>

              <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
                {template.title}
              </h1>
              <p className='mt-3 text-sm font-semibold leading-7 text-indigo-950/80'>
                {template.description}
              </p>

              <div className='mt-4 flex items-center gap-3'>
                <StarRating
                  rating={template.averageRating}
                  size={18}
                />
                {template.reviewCount > 0 && (
                  <span className='text-sm font-semibold text-gray-600'>
                    ({template.reviewCount}{' '}
                    {template.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </div>

              <div className='mt-6 grid gap-3 sm:grid-cols-2'>
                <Button
                  className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
                  size='lg'
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
                <Button
                  className='w-full bg-white/40 text-indigo-950 hover:bg-white/55'
                  size='lg'
                  onClick={() => router.back()}
                >
                  Go back
                </Button>
              </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <motion.section
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='rounded-3xl border border-white/30 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10 p-6'
              >
                <div className='text-sm font-extrabold text-indigo-950'>
                  Template details
                </div>
                <div className='mt-4 grid gap-3'>
                  <div className='rounded-2xl border border-white/30 bg-white/25 p-4'>
                    <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                      Template ID
                    </div>
                    <div className='mt-1 break-all text-sm font-extrabold text-indigo-950'>
                      {template._id}
                    </div>
                  </div>
                  <div className='rounded-2xl border border-white/30 bg-white/25 p-4'>
                    <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                      Created
                    </div>
                    <div className='mt-1 text-sm font-extrabold text-indigo-950'>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </motion.section>

              <motion.section
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='rounded-3xl border border-white/30 bg-gradient-to-br from-amber-500/12 via-rose-500/10 to-fuchsia-500/12 p-6'
              >
                <div className='text-sm font-extrabold text-indigo-950'>
                  About the creator
                </div>
                <div className='mt-4 space-y-3'>
                  {creatorBio ? (
                    <div className='rounded-2xl border border-white/30 bg-white/25 p-4 text-sm font-semibold leading-7 text-indigo-950/80'>
                      {creatorBio}
                    </div>
                  ) : (
                    <div className='rounded-2xl border border-white/30 bg-white/25 p-4 text-sm font-semibold text-indigo-950/80'>
                      Creator information is not available.
                    </div>
                  )}

                  {creatorCountry && (
                    <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/35 px-4 py-2 text-sm font-extrabold text-indigo-950'>
                      <Globe className='h-4 w-4 text-emerald-700' />
                      {creatorCountry}
                    </div>
                  )}

                  {typeof template.author !== 'string' && (
                    <Link
                      href={`/creators/${template.author._id}`}
                      className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/40 px-4 py-2 text-sm font-extrabold text-indigo-950 transition hover:bg-white/55'
                    >
                      Open creator profile
                    </Link>
                  )}
                </div>
              </motion.section>
            </div>
          </div>
        </motion.section>

        {/* Reviews Section */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl font-extrabold text-indigo-950'>Reviews</h2>
            {token && !myReview && !showReviewForm && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className='rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white'
              >
                Write a Review
              </Button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className='mb-8 rounded-2xl border border-white/30 bg-white/50 p-6'>
              <h3 className='text-lg font-extrabold text-indigo-950 mb-4'>
                {editingReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>
              <ReviewForm
                templateId={template._id}
                existingReview={editingReview}
                onSubmit={
                  editingReview ? handleUpdateReview : handleCreateReview
                }
                onCancel={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                }}
                isSubmitting={
                  createReviewMutation.isPending ||
                  updateReviewMutation.isPending
                }
              />
            </div>
          )}

          {/* Review List */}
          <ReviewList
            reviews={reviews}
            currentUserId={myReview?.user._id}
            onEdit={(review) => {
              setEditingReview(review);
              setShowReviewForm(true);
            }}
            onDelete={handleDeleteReview}
            isDeleting={deleteReviewMutation.isPending}
          />
        </motion.section>
      </div>
    </div>
  );
}
