import { z } from 'zod';

/**
 * Category admin writes. The three level depth (a major category, the
 * ranges under it, their sub ranges) is enforced in Postgres by a trigger,
 * migrations 19 and 58, because a CHECK cannot see another row. This schema
 * still refuses the shapes it can catch client side, so the form fails with
 * a real message instead of a database error string.
 */

export const slugifyCategoryName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const categorySlug = z
  .string()
  .trim()
  .min(2, 'Need a slug')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const categoryName = z.string().trim().min(2, 'Name the range').max(120);

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

export const createCategorySchema = z.object({
  name: categoryName,
  slug: categorySlug,
  /** Null makes this a major category. A uuid nests it under a major
   *  category or a range. The depth trigger is the authority on what fits. */
  parentId: z.preprocess(emptyToNull, z.uuid().nullable()),
});

export const updateCategorySchema = z.object({
  categoryId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  name: categoryName,
  slug: categorySlug,
  parentId: z.preprocess(emptyToNull, z.uuid().nullable()),
  description: optionalText(4000),
  metaTitle: optionalText(70),
  metaDescription: optionalText(180),
  isPublished: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
});

export const deleteCategorySchema = z.object({
  categoryId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});
