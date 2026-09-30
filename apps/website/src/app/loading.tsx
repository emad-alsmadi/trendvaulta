import { getTranslation } from '@/lib/i18n-server';
import { PageHeaderSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default async function Loading() {
  const { t } = await getTranslation();
  return (
    <div className='mx-auto max-w-7xl space-y-8 py-8'>
      <PageHeaderSkeleton />
      <ProductGridSkeleton
        label={t('errors.loading')}
        className='grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4'
      />
    </div>
  );
}
