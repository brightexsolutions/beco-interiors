import { jpegResponse } from '@/lib/og/card';
import { rangeSharePhoto, renderCatalogueCard } from '@/lib/og/catalogue';
import { flattenTree, getCategoryWithTree, getProductsInCategories } from '@/lib/products';

/**
 * A range's share card, from a photograph of something in it: an installed
 * room where there is one. Cached for the same hour the range page is.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = await getCategoryWithTree(slug);
  if (!place) return new Response('Not found', { status: 404 });
  const products = await getProductsInCategories(flattenTree([place.category]).map((c) => c.id));
  const card = await renderCatalogueCard(
    rangeSharePhoto(products)?.path,
    { eyebrow: place.parent?.name ?? 'Shop', title: place.category.name },
    'shop',
  );
  return jpegResponse(card, 3600);
}
