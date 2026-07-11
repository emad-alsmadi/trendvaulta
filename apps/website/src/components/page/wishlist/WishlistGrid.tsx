import { WishlistItem } from '@/types';
import { WishlistCard } from './WishlistCard';

interface WishlistGridProps {
  items: WishlistItem[];
}

export function WishlistGrid({ items }: WishlistGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {items.map((item) => (
        <WishlistCard
          key={item._id}
          item={item}
        />
      ))}
    </div>
  );
}
