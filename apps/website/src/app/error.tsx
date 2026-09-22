'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { logErrorForDev } from '@/lib/userFacingError';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logErrorForDev(error);
  }, [error]);

  return (
    <div className='mx-auto max-w-lg py-20 text-center'>
      <h1 className='text-2xl font-bold text-gray-900'>Something went wrong</h1>
      <p className='mt-2 text-sm text-gray-600'>
        This page could not be displayed. You can try again or head back home.
      </p>
      <div className='mt-6 flex items-center justify-center gap-3'>
        <Button type='button' onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href='/'
          className='text-sm font-semibold text-gray-700 hover:text-gray-900'
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
