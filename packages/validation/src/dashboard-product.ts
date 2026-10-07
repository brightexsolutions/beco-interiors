import { z } from 'zod';
import { AVAILABILITY, IMAGE_ROLES, PRICE_DISPLAY_MODES, PRODUCT_BADGES } from '@beco/types';

/**
 * Catalogue editor writes. Stock follows D68: half units for a per-slab
 * product, whole units otherwise, never negative. Empty quantity means
 * uncounted, not zero: zero is out of stock on the storefront.
 */

export const PRODUCT_UNITS = ['per slab', 'per piece', 'per metre'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const stockStepFor = (unit: string | null | undefined): 0.5 | 1 =>
  unit === 'per slab' ? 0.5 : 1;

export const slugifyProductName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const productSlug = z
  .string()
  .trim()
  .min(2, 'Need a slug')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const productName = z.string().trim().min(2, 'Name the product').max(120);

const productSku = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const next = value.trim().replace(/\s+/g, ' ');
  return next === '' ? null : next;
}, z.union([z.null(), z.string().min(1, 'Need a product code').max(80)]));

export const isValidStockAmount = (value: number, unit: string | null | undefined): boolean => {
  if (!(value >= 0) || !Number.isFinite(value)) return false;
  const step = stockStepFor(unit);
  return Math.abs(value / step - Math.round(value / step)) < 1e-9;
};

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalAmount = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.coerce.number().min(0, 'A quantity cannot be negative').max(10_000_000)]),
);

const optionalPrice = z.preprocess(
  emptyToNull,
  z.union([
    z.null(),
    z.coerce.number().positive('A price must be more than zero').max(10_000_000),
  ]),
);

const specRow = z.object({
  label: z.string().trim().max(80),
  value: z.string().trim().max(240),
});

export const updateProductSchema = z
  .object({
    productId: z.uuid(),
    updatedAt: z.string().min(1, 'Missing lock token'),
    name: productName,
    slug: productSlug,
    sku: productSku,
    categoryId: z.preprocess(emptyToNull, z.uuid().nullable()),
    unit: z.preprocess(emptyToNull, z.enum(PRODUCT_UNITS).nullable()),
    priceDisplayMode: z.enum(PRICE_DISPLAY_MODES),
    price: optionalPrice,
    compareAtPrice: optionalPrice,
    availability: z.enum(AVAILABILITY),
    badge: z.preprocess(emptyToNull, z.enum(PRODUCT_BADGES).nullable()),
    // Optional since the editor's own checkbox went (D133): a plain Save leaves
    // the published flag alone, and only the top Publish control sends it.
    isPublished: z.preprocess(
      (value) => (value == null || value === '' ? undefined : value === true || value === 'true' || value === 'on'),
      z.boolean().optional(),
    ),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    shortDescription: z.preprocess(emptyToNull, z.string().trim().max(400).nullable()),
    description: z.preprocess(emptyToNull, z.string().trim().max(8000).nullable()),
    metaTitle: z.preprocess(emptyToNull, z.string().trim().max(70).nullable()),
    metaDescription: z.preprocess(emptyToNull, z.string().trim().max(180).nullable()),
    specs: z.array(specRow).max(20).default([]),
    stockQuantity: optionalAmount,
    lowStockThreshold: optionalAmount,
  })
  .superRefine((value, ctx) => {
    if (value.priceDisplayMode === 'poa' && value.price != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'A price on application product cannot carry a price',
      });
    }
    if (value.priceDisplayMode === 'fixed' && value.price == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'A fixed price product must have a price',
      });
    }
    if (value.compareAtPrice != null && (value.price == null || value.compareAtPrice <= value.price)) {
      ctx.addIssue({
        code: 'custom',
        path: ['compareAtPrice'],
        message: 'The compare-at price has to be higher than the selling price',
      });
    }
    if (value.stockQuantity != null && !isValidStockAmount(value.stockQuantity, value.unit)) {
      ctx.addIssue({
        code: 'custom',
        path: ['stockQuantity'],
        message:
          value.unit === 'per slab'
            ? 'Slabs stock in half units'
            : 'This product stocks in whole units',
      });
    }
    if (value.lowStockThreshold != null && !isValidStockAmount(value.lowStockThreshold, value.unit)) {
      ctx.addIssue({
        code: 'custom',
        path: ['lowStockThreshold'],
        message:
          value.unit === 'per slab'
            ? 'The low-stock mark for a slab is a half unit'
            : 'The low-stock mark is a whole unit',
      });
    }
  });

/**
 * The editor's Publish and Unpublish control. Only the flag is written, under
 * the same optimistic lock as every other product write. `published` must be
 * an explicit true or false: anything else is refused rather than read as
 * "unpublish".
 */
export const setProductPublishedSchema = z.object({
  productId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  published: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean({ message: 'Say whether to publish or unpublish' }),
  ),
});

export const deleteProductSchema = z.object({
  productId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});

export const createProductSchema = z
  .object({
    name: productName,
    slug: productSlug,
    sku: productSku,
    categoryId: z.uuid(),
    unit: z.enum(PRODUCT_UNITS),
    priceDisplayMode: z.enum(PRICE_DISPLAY_MODES),
    price: optionalPrice,
  })
  .superRefine((value, ctx) => {
    if (value.priceDisplayMode === 'poa' && value.price != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'A price on application product cannot carry a price',
      });
    }
    if (value.priceDisplayMode === 'fixed' && value.price == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'A fixed price product must have a price',
      });
    }
  });

const productImagePath = z
  .string()
  .trim()
  .min(3, 'Missing photograph')
  .max(240)
  .regex(/^[a-z0-9]+(?:[/_-][a-z0-9]+)*$/, 'That photograph path is not valid');

export const addProductImageSchema = z.object({
  productId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  role: z.enum(IMAGE_ROLES),
  alt: z.string().trim().min(2, 'Describe the photograph').max(180),
});

export const removeProductImageSchema = z.object({
  productId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  path: productImagePath,
});

export const productImageMetaSchema = z.object({
  role: z.enum(IMAGE_ROLES),
  path: productImagePath,
  alt: z.string().trim().min(1).max(180),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blur: z.string().max(8000).optional(),
  sort: z.number().int().min(0).max(99),
});

export const saveProductImagesSchema = z.object({
  productId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  images: z.array(productImageMetaSchema).max(20),
});

export const specsToRecord = (rows: readonly { label: string; value: string }[]): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const row of rows) {
    if (!row.label || !row.value) continue;
    next[row.label] = row.value;
  }
  return next;
};

export const specsFromRecord = (specs: unknown): { label: string; value: string }[] => {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];
  return Object.entries(specs as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string')
    .map(([label, value]) => ({ label, value: value as string }));
};
