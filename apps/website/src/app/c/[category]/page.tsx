import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryLanding } from '@/components/category/CategoryLanding';
import { CATEGORY_SLUGS, getCategory } from '@/lib/categories';
import { buildCategoryMetadata, fetchSubcategories } from '@/lib/categoryPage';
import { getTranslation } from '@/lib/i18n-server';

type Params = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const def = getCategory(category);
  if (!def) {
    return { title: 'Category', robots: { index: false, follow: true } };
  }
  const { t } = await getTranslation();
  return buildCategoryMetadata(def, undefined, t);
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  const def = getCategory(category);
  if (!def) notFound();

  const subcategories = await fetchSubcategories(def);

  return <CategoryLanding def={def} subcategories={subcategories} />;
}
