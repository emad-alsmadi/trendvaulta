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
    <div className='grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3'>
      {items.map((item) => (
        <WishlistCard
          key={item._id}
          item={item}
        />
      ))}
    </div>
  );
}
