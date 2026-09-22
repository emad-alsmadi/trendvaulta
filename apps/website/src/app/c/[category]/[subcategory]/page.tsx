import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryLanding } from '@/components/category/CategoryLanding';
import { CATEGORIES, getCategory } from '@/lib/categories';
import {
  buildCategoryMetadata,
  fetchSubcategories,
  isValidSubcategorySlug,
} from '@/lib/categoryPage';

type Params = { params: Promise<{ category: string; subcategory: string }> };

export function generateStaticParams() {
  return CATEGORIES.flatMap((c) =>
    c.subcategories.map((subcategory) => ({ category: c.slug, subcategory })),
  );
}

function resolve(category: string, subcategory: string) {
  const def = getCategory(category);
  const sub = subcategory.trim().toLowerCase();
  if (!def || !isValidSubcategorySlug(sub)) return null;
  return { def, sub };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, subcategory } = await params;
  const resolved = resolve(category, subcategory);
  if (!resolved) {
    return { title: 'Category', robots: { index: false, follow: true } };
  }
  return buildCategoryMetadata(resolved.def, resolved.sub);
}

export default async function SubcategoryPage({ params }: Params) {
  const { category, subcategory } = await params;
  const resolved = resolve(category, subcategory);
  if (!resolved) notFound();

  const subcategories = await fetchSubcategories(resolved.def);

  return (
    <CategoryLanding
      def={resolved.def}
      subcategories={subcategories}
      subcategory={resolved.sub}
    />
  );
}
