'use server';

import { randomBytes } from 'node:crypto';
import { generateBlogDraftSchema, saveBlogPostSchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { draftWithGemini } from '@/lib/blog-generate';
import {
  blogMutationMessage,
  fetchBlogPost,
  readingTimeMinutes,
  type StaffBlogPost,
} from '@/lib/blog';
import { processProductPhoto } from '@/lib/product-photo';
import { photoUploadProblem } from '@/lib/photo-upload';
import {
  deleteProductDerivatives,
  isProductStorageConfigured,
  uploadProductDerivatives,
} from '@/lib/product-storage';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';

export interface BlogActionState {
  error?: string;
  ok?: string;
  postId?: string;
  draft?: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    metaTitle: string;
    metaDescription: string;
    tags: string;
    category: string;
    coverImageAlt: string;
    model: string;
  };
}

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

async function catalogueContext(): Promise<string> {
  try {
    const supabase = await getSupabase();
    // products has no list_price column, that is quote_items and order_items recording
    // the price at the time of the quote. The live catalogue price is products.price.
    const { data } = await supabase
      .from('products')
      .select('name, price')
      .eq('is_published', true)
      .is('deleted_at', null)
      .limit(12);
    if (!data?.length) return '';
    return data
      .map((row) => `${row.name}${row.price != null ? `, KES ${row.price}` : ''}`)
      .join('\n');
  } catch {
    return '';
  }
}

const bust = async (post: Pick<StaffBlogPost, 'slug' | 'status'>) => {
  await revalidateStorefrontPaths(['/blog', `/blog/${post.slug}`], '/studio/blog');
};

export async function generateBlogDraft(
  _prev: BlogActionState,
  form: FormData,
): Promise<BlogActionState> {
  await requirePath('/studio/blog');
  const parsed = generateBlogDraftSchema.safeParse({
    brief: formString(form, 'brief'),
    targetTerm: formString(form, 'targetTerm'),
    related: formString(form, 'related'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the brief, then try again.' };
  }
  const result = await draftWithGemini({
    brief: parsed.data.brief,
    targetTerm: parsed.data.targetTerm,
    related: parsed.data.related,
    catalogue: await catalogueContext(),
  });
  if (result.error || !result.draft) return { error: result.error ?? 'No draft came back.' };
  const draft = result.draft;
  return {
    ok: 'Draft generated. Read it, then save.',
    draft: {
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      body: draft.body,
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      tags: draft.tags.join(', '),
      category: draft.category,
      coverImageAlt: draft.coverImageAlt,
      model: draft.model,
    },
  };
}

export async function saveBlogPost(
  _prev: BlogActionState,
  form: FormData,
): Promise<BlogActionState> {
  const session = await requirePath('/studio/blog');
  const parsed = saveBlogPostSchema.safeParse({
    postId: formString(form, 'postId') || undefined,
    title: formString(form, 'title'),
    slug: formString(form, 'slug'),
    excerpt: formString(form, 'excerpt'),
    body: formString(form, 'body'),
    category: formString(form, 'category'),
    tags: formString(form, 'tags'),
    metaTitle: formString(form, 'metaTitle'),
    metaDescription: formString(form, 'metaDescription'),
    targetTerm: formString(form, 'targetTerm'),
    author: formString(form, 'author'),
    coverImageAlt: formString(form, 'coverImageAlt'),
    status: formString(form, 'status') || 'draft',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const existing = parsed.data.postId ? await fetchBlogPost(supabase, parsed.data.postId) : null;
  if (parsed.data.status === 'published' && !existing?.coverImage && !parsed.data.coverImageAlt) {
    return { error: 'A published article needs a cover photograph and alt text.' };
  }
  if (parsed.data.status === 'published' && !existing?.coverImage) {
    return { error: 'Upload a cover photograph before you publish.' };
  }

  const readingTime = readingTimeMinutes(parsed.data.body);
  const publishedAt =
    parsed.data.status === 'published'
      ? (existing?.publishedAt ?? new Date().toISOString())
      : existing?.publishedAt ?? null;

  const row = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt,
    body: parsed.data.body,
    category: parsed.data.category,
    tags: parsed.data.tags,
    meta_title: parsed.data.metaTitle,
    meta_description: parsed.data.metaDescription,
    target_term: parsed.data.targetTerm,
    author: parsed.data.author,
    cover_image_alt: parsed.data.coverImageAlt,
    status: parsed.data.status,
    published_at: parsed.data.status === 'published' ? publishedAt : null,
    reading_time: readingTime,
    generated_by_model: formString(form, 'generatedByModel') || existing?.generatedByModel || null,
    generation_prompt: formString(form, 'generationPrompt') || existing?.generationPrompt || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(row)
      .eq('id', existing.id)
      .select('id, slug, status')
      .maybeSingle();
    if (error) return { error: blogMutationMessage(error) };
    if (!data) return { error: 'That article is gone.' };
    await bust({ slug: data.slug, status: data.status });
    return { ok: parsed.data.status === 'published' ? 'Article published.' : 'Draft saved.', postId: data.id };
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({ ...row, author: parsed.data.author || session.fullName })
    .select('id, slug, status')
    .maybeSingle();
  if (error) return { error: blogMutationMessage(error) };
  if (!data?.id) return { error: 'The database refused that write.' };
  await bust({ slug: data.slug, status: data.status });
  return { ok: 'Draft saved.', postId: data.id };
}

export async function uploadBlogCover(
  _prev: BlogActionState,
  form: FormData,
): Promise<BlogActionState> {
  await requirePath('/studio/blog');
  const postId = formString(form, 'postId');
  const file = form.get('file');
  if (!postId) return { error: 'Save the draft before you add a cover.' };
  const problem = photoUploadProblem(file);
  if (problem || !(file instanceof File)) return { error: problem ?? 'Choose a photograph first.' };
  if (!isProductStorageConfigured()) {
    return { error: 'Photograph storage is not configured. Add the R2 keys, then try again.' };
  }

  const supabase = await getSupabase();
  const existing = await fetchBlogPost(supabase, postId);
  if (!existing) return { error: 'That article is gone.' };

  let processed;
  try {
    processed = await processProductPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'That file is not a photograph we can read.' };
  }

  const stem = `blog/${postId}/${randomBytes(4).toString('hex')}`;
  await uploadProductDerivatives(stem, processed.derivatives);
  if (existing.coverImage) await deleteProductDerivatives(existing.coverImage.path);

  const { error } = await supabase
    .from('blog_posts')
    .update({
      cover_image: {
        path: stem,
        width: processed.width,
        height: processed.height,
        blur: processed.blurDataUrl,
      },
      cover_image_alt: formString(form, 'coverImageAlt') || existing.coverImageAlt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
  if (error) return { error: blogMutationMessage(error) };
  await bust(existing);
  return { ok: 'Cover uploaded.' };
}

export async function removeBlogCover(
  _prev: BlogActionState,
  form: FormData,
): Promise<BlogActionState> {
  await requirePath('/studio/blog');
  const postId = formString(form, 'postId');
  const supabase = await getSupabase();
  const existing = await fetchBlogPost(supabase, postId);
  if (!existing) return { error: 'That article is gone.' };
  if (existing.coverImage) await deleteProductDerivatives(existing.coverImage.path);
  const { error } = await supabase
    .from('blog_posts')
    .update({ cover_image: null, updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (error) return { error: blogMutationMessage(error) };
  await bust(existing);
  return { ok: 'Cover removed.' };
}
