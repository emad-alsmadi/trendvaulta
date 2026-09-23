'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { logErrorForDev } from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    logErrorForDev(error);
  }, [error]);

  return (
    <div className='mx-auto max-w-lg py-20 text-center'>
      <h1 className='text-2xl font-bold text-gray-900'>
        {t('errors.routeError.title')}
      </h1>
      <p className='mt-2 text-sm text-gray-600'>
        {t('errors.routeError.description')}
      </p>
      <div className='mt-6 flex items-center justify-center gap-3'>
        <Button type='button' onClick={() => reset()}>
          {t('errors.routeError.tryAgain')}
        </Button>
        <Link
          href='/'
          className='text-sm font-semibold text-gray-700 hover:text-gray-900'
        >
          {t('errors.routeError.goHome')}
        </Link>
      </div>
    </div>
  );
}
