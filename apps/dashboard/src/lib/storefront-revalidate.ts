import { revalidatePath } from 'next/cache';

/**
 * Bust the storefront after a catalogue write.
 *
 * `revalidateTag` only runs inside the Next.js process that cached the page.
 * The dashboard and the storefront are separate Vercel projects, so the
 * dashboard POSTs to the storefront `/api/revalidate` with a shared secret.
 * Dashboard `/products` still revalidates in this process so the editor
 * list refreshes even if the storefront is down.
 */
export async function revalidateStorefront(input: {
  productSlug: string;
  categorySlug?: string | null;
  formerSlug?: string | null;
}): Promise<void> {
  revalidatePath('/products');

  const tags = [`product:${input.productSlug}`];
  const paths = [`/product/${input.productSlug}`, '/shop'];
  if (input.formerSlug && input.formerSlug !== input.productSlug) {
    tags.push(`product:${input.formerSlug}`);
    paths.push(`/product/${input.formerSlug}`);
  }
  if (input.categorySlug) {
    tags.push(`category:${input.categorySlug}`);
    paths.push(`/shop/${input.categorySlug}`);
  }

  const origin = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!origin || !secret) return;

  try {
    await fetch(`${origin.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ tags, paths }),
    });
  } catch {
    // A storefront outage must not roll back the catalogue write.
  }
}

/** Bust the storefront after a category write: a rename, a publish toggle,
 *  a reparent. `/shop` always changes shape; the category's own page and,
 *  if it sits under a group, that group's listing page do too. */
export async function revalidateCategory(input: {
  categorySlug: string;
  parentSlug?: string | null;
  formerSlug?: string | null;
}): Promise<void> {
  const paths = ['/shop', `/shop/${input.categorySlug}`];
  if (input.formerSlug && input.formerSlug !== input.categorySlug) {
    paths.push(`/shop/${input.formerSlug}`);
  }
  if (input.parentSlug) paths.push(`/shop/${input.parentSlug}`);
  await revalidateStorefrontPaths(paths, '/categories');
}

export async function revalidateStorefrontPaths(
  paths: string[],
  dashboardPath = '/announcements',
): Promise<void> {
  revalidatePath(dashboardPath);

  const origin = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!origin || !secret) return;

  const safe = paths.filter((path) => path.startsWith('/'));
  if (safe.length === 0) return;

  try {
    await fetch(`${origin.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ tags: [], paths: safe }),
    });
  } catch {
    // A storefront outage must not roll back the announcement write.
  }
}
