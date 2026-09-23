'use server';

import { createCategorySchema, deleteCategorySchema, updateCategorySchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { categoryMutationMessage } from '@/lib/category-errors';
import { revalidateCategory } from '@/lib/storefront-revalidate';

export interface CategoryActionState {
  error?: string;
  ok?: string;
  slug?: string;
}

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const parentSlugOf = async (
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  parentId: string | null,
): Promise<string | null> => {
  if (!parentId) return null;
  const { data } = await supabase.from('categories').select('slug').eq('id', parentId).maybeSingle();
  return data?.slug ?? null;
};

export async function createCategory(
  _prev: CategoryActionState,
  form: FormData,
): Promise<CategoryActionState> {
  await requirePath('/categories');
  const parsed = createCategorySchema.safeParse({
    name: formString(form, 'name'),
    slug: formString(form, 'slug'),
    parentId: formString(form, 'parentId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parentId,
      is_published: false,
    })
    .select('slug')
    .maybeSingle();

  if (error) return { error: categoryMutationMessage(error) };
  if (!data?.slug) return { error: 'The database refused that write.' };

  const parentSlug = await parentSlugOf(supabase, parsed.data.parentId);
  await revalidateCategory({ categorySlug: data.slug, parentSlug });
  return { ok: 'Draft created. Publish it once it has something to show.', slug: data.slug };
}

export async function updateCategory(
  _prev: CategoryActionState,
  form: FormData,
): Promise<CategoryActionState> {
  await requirePath('/categories');
  const parsed = updateCategorySchema.safeParse({
    categoryId: formString(form, 'categoryId'),
    updatedAt: formString(form, 'updatedAt'),
    name: formString(form, 'name'),
    slug: formString(form, 'slug'),
    parentId: formString(form, 'parentId'),
    description: formString(form, 'description'),
    metaTitle: formString(form, 'metaTitle'),
    metaDescription: formString(form, 'metaDescription'),
    isPublished: form.get('isPublished'),
    sortOrder: formString(form, 'sortOrder'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const former = await supabase
    .from('categories')
    .select('slug, parent_id')
    .eq('id', parsed.data.categoryId)
    .maybeSingle();
  const formerSlug = former.data?.slug ?? parsed.data.slug;

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parentId,
      description: parsed.data.description,
      meta_title: parsed.data.metaTitle,
      meta_description: parsed.data.metaDescription,
      is_published: parsed.data.isPublished,
      sort_order: parsed.data.sortOrder,
    })
    .eq('id', parsed.data.categoryId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('slug')
    .maybeSingle();

  if (error) return { error: categoryMutationMessage(error) };
  if (!data) return { error: 'This range changed while you were editing. Reload and try again.' };

  const parentSlug = await parentSlugOf(supabase, parsed.data.parentId);
  await revalidateCategory({ categorySlug: data.slug, parentSlug, formerSlug });
  return { ok: 'Saved.' };
}

export async function deleteCategory(
  _prev: CategoryActionState,
  form: FormData,
): Promise<CategoryActionState> {
  await requirePath('/categories');
  const parsed = deleteCategorySchema.safeParse({
    categoryId: formString(form, 'categoryId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('categories')
    .select('slug, parent_id')
    .eq('id', parsed.data.categoryId)
    .maybeSingle();
  if (!current.data) return { error: 'That range is already gone.' };

  // Neither foreign key restrains this: a product's category_id and a
  // child's parent_id both go quietly null on delete. That is correct for
  // an unpublish, wrong for the delete button, so it is enforced here
  // rather than trusted to the database. The editor already hides Delete
  // for the same reason; this is the server side of that rule, rule 7.
  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', parsed.data.categoryId),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', parsed.data.categoryId),
  ]);
  if ((productCount ?? 0) > 0 || (childCount ?? 0) > 0) {
    return {
      error:
        (childCount ?? 0) > 0
          ? 'This group still has ranges under it. Move or delete them first.'
          : 'Products are still filed under this range. Move or remove them first.',
    };
  }

  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', parsed.data.categoryId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: categoryMutationMessage(error) };
  if (!data) return { error: 'This range changed while you were editing. Reload and try again.' };

  const parentSlug = await parentSlugOf(supabase, current.data.parent_id);
  await revalidateCategory({ categorySlug: current.data.slug, parentSlug });
  return { ok: 'Removed.' };
}
