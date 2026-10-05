import { jpegResponse } from '@/lib/og/card';
import { renderCatalogueCard } from '@/lib/og/catalogue';
import { getProductBySlug, primaryImage } from '@/lib/products';

/**
 * A product's share card, from its own primary photograph. Drawn on first
 * request and cached for the same hour the product page itself is.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return new Response('Not found', { status: 404 });
  const card = await renderCatalogueCard(
    primaryImage(product)?.path,
    { eyebrow: product.category?.name ?? 'Beco Interiors', title: product.name },
    'shop',
  );
  return jpegResponse(card, 3600);
}
