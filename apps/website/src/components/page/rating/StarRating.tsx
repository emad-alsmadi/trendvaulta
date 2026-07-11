import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  size = 16,
  showValue = true,
  className = '',
}: StarRatingProps) {
  // Handle undefined, null, or invalid ratings
  const safeRating =
    typeof rating === 'number' && !isNaN(rating)
      ? Math.max(0, Math.min(5, rating))
      : 0;

  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className='flex items-center'>
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            className='fill-amber-400 text-amber-400'
          />
        ))}
        {hasHalfStar && (
          <StarHalf
            size={size}
            className='fill-amber-400 text-amber-400'
          />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={size}
            className='text-gray-300'
          />
        ))}
      </div>
      {showValue && safeRating > 0 && (
        <span className='text-sm font-semibold text-gray-700 ml-1'>
          {safeRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
