import { describe, expect, it } from 'vitest';
import {
  createCategorySchema,
  deleteCategorySchema,
  slugifyCategoryName,
  updateCategorySchema,
} from '../dashboard-category';

describe('slugifyCategoryName', () => {
  it('lowercases, strips accents and hyphenates', () => {
    expect(slugifyCategoryName('SPC Flooring & Panels')).toBe('spc-flooring-panels');
  });
});

describe('createCategorySchema', () => {
  const base = { name: 'Sintered Stone', slug: 'sintered-stone', parentId: null };

  it('accepts a top level group with no parent', () => {
    const parsed = createCategorySchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('accepts a child with a parent id', () => {
    const parsed = createCategorySchema.safeParse({
      ...base,
      parentId: '11111111-1111-4111-8111-111111111111',
    });
    expect(parsed.success).toBe(true);
  });

  it('treats an empty parent as null rather than an invalid uuid', () => {
    const parsed = createCategorySchema.safeParse({ ...base, parentId: '' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.parentId).toBeNull();
  });

  it('refuses a slug with a capital letter or a space', () => {
    expect(createCategorySchema.safeParse({ ...base, slug: 'Sintered Stone' }).success).toBe(false);
  });

  it('refuses a one character name', () => {
    expect(createCategorySchema.safeParse({ ...base, name: 'S' }).success).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  const base = {
    categoryId: '11111111-1111-4111-8111-111111111111',
    updatedAt: '2026-09-23T10:00:00.000Z',
    name: 'Sintered Stone',
    slug: 'sintered-stone',
    parentId: null,
    description: 'Large format slabs.',
    metaTitle: null,
    metaDescription: null,
    isPublished: true,
    sortOrder: 10,
  };

  it('accepts a full edit', () => {
    expect(updateCategorySchema.safeParse(base).success).toBe(true);
  });

  it('treats an empty description as null, not an empty string', () => {
    const parsed = updateCategorySchema.safeParse({ ...base, description: '' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.description).toBeNull();
  });

  it('coerces the checkbox string shape isPublished can arrive as', () => {
    const parsed = updateCategorySchema.safeParse({ ...base, isPublished: 'on' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.isPublished).toBe(true);
  });

  it('refuses a missing lock token', () => {
    expect(updateCategorySchema.safeParse({ ...base, updatedAt: '' }).success).toBe(false);
  });
});

describe('deleteCategorySchema', () => {
  it('requires a category id and a lock token', () => {
    expect(
      deleteCategorySchema.safeParse({
        categoryId: '11111111-1111-4111-8111-111111111111',
        updatedAt: '2026-09-23T10:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(deleteCategorySchema.safeParse({ categoryId: 'not-a-uuid', updatedAt: 'x' }).success).toBe(false);
  });
});
