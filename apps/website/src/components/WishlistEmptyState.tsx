import Link from 'next/link';
import { Button } from './ui/Button';
import { Heart } from 'lucide-react';

export function WishlistEmptyState() {
  return (
    <div className='flex flex-col items-center justify-center py-16 px-4'>
      <div className='mb-6 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/20 to-cyan-500/20 p-8'>
        <Heart className='h-16 w-16 text-indigo-400' fill='none' strokeWidth={1.5} />
      </div>
      <h2 className='mb-2 text-2xl font-extrabold text-indigo-950'>
        Your wishlist is empty
      </h2>
      <p className='mb-8 text-center text-sm font-semibold text-indigo-900/70 max-w-md'>
        Save templates you love by clicking the heart icon. They'll appear here for easy access.
      </p>
      <Link href='/'>
        <Button>Browse Templates</Button>
      </Link>
    </div>
  );
}
