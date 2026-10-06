import { revalidatePath } from 'next/cache';
import { environmentName, reportOpsFailure } from './ops-alert';

/**
 * Bust the storefront after a catalogue write.
 *
 * `revalidateTag` only runs inside the Next.js process that cached the page.
 * The dashboard and the storefront are separate Vercel projects, so the
 * dashboard POSTs to the storefront `/api/revalidate` with a shared secret.
 * Dashboard `/products` still revalidates in this process so the editor
 * list refreshes even if the storefront is down.
 *
 * A failure never rolls back the write, but it is reported: a price change
 * saved here and not shown on www.beco.co.ke looks to staff like the
 * dashboard is broken. `fetch` only throws on a network error, so a 401 from
 * a mismatched secret or a 500 has to be checked for explicitly.
 */
async function postRevalidate(body: { tags: string[]; paths: string[] }, what: string): Promise<void> {
  const origin = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!origin || !secret) {
    if (environmentName() === 'production') {
      await reportOpsFailure({
        area: 'storefront.revalidate',
        summary: 'Storefront refresh is not configured, catalogue edits will not reach the live site',
        detail: `${!origin ? 'STOREFRONT_URL' : 'REVALIDATE_SECRET'} is not set`,
        dedupeKey: 'storefront.revalidate:config',
      });
    }
    return;
  }

  const context = { what, paths: body.paths.join(' ') };
  try {
    const response = await fetch(`${origin.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      await reportOpsFailure({
        area: 'storefront.revalidate',
        summary: `Storefront refused a refresh after ${what} (HTTP ${response.status})`,
        detail: response.status === 401 ? 'REVALIDATE_SECRET does not match the storefront' : response.statusText,
        context,
        dedupeKey: `storefront.revalidate:${response.status}`,
      });
    }
  } catch (error) {
    await reportOpsFailure({
      area: 'storefront.revalidate',
      summary: `Storefront could not be reached to refresh after ${what}`,
      error,
      context,
      dedupeKey: 'storefront.revalidate:unreachable',
    });
  }
}

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

  await postRevalidate({ tags, paths }, `a product edit (${input.productSlug})`);
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

  const safe = paths.filter((path) => path.startsWith('/'));
  if (safe.length === 0) return;

  await postRevalidate({ tags: [], paths: safe }, `an edit on ${dashboardPath}`);
}
