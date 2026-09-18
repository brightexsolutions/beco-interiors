import { z } from 'zod';

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(max)]));

const EM_DASH = /\u2014/;
const BANNED = [
  /\bdelve\b/i,
  /\btapestry\b/i,
  /\bin today's fast[- ]paced world\b/i,
  /\bit'?s not just\b/i,
];

export const BLOG_BANNED_MESSAGE =
  'This draft still has phrasing we do not publish. Remove em dashes and the usual filler, then save again.';

export function findBannedBlogCopy(text: string): string | null {
  if (EM_DASH.test(text)) return BLOG_BANNED_MESSAGE;
  if (BANNED.some((pattern) => pattern.test(text))) return BLOG_BANNED_MESSAGE;
  return null;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Need a slug')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const tagsFrom = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().trim().min(1).max(40)).max(12));

export const blogFieldsSchema = z
  .object({
    title: z.string().trim().min(8, 'Name the article').max(80),
    slug: slugSchema,
    excerpt: optionalText(280),
    body: z.string().trim().min(40, 'Write the article').max(40000),
    category: optionalText(60),
    tags: tagsFrom,
    metaTitle: optionalText(60),
    metaDescription: optionalText(155),
    targetTerm: z.string().trim().min(3, 'Name the search term').max(80),
    author: z
      .string()
      .trim()
      .min(2, 'Name a person')
      .max(80)
      .refine((value) => !/\b(ai|gemini)\b/i.test(value), {
        message: 'The byline names a person, never the model',
      }),
    coverImageAlt: optionalText(180),
    status: z.enum(['draft', 'published']),
  })
  .superRefine((value, ctx) => {
    const banned = findBannedBlogCopy(
      [value.title, value.excerpt ?? '', value.body, value.metaTitle ?? '', value.metaDescription ?? ''].join('\n'),
    );
    if (banned) {
      ctx.addIssue({ code: 'custom', path: ['body'], message: banned });
    }
    if (value.status === 'published' && !value.coverImageAlt) {
      ctx.addIssue({
        code: 'custom',
        path: ['coverImageAlt'],
        message: 'A published article needs alt text on the cover',
      });
    }
  });

export const saveBlogPostSchema = blogFieldsSchema.extend({
  postId: z.uuid().optional(),
});

export const generateBlogDraftSchema = z.object({
  brief: z.string().trim().min(8, 'Give a title or a brief').max(400),
  targetTerm: z.string().trim().min(3, 'Name the search term').max(80),
  related: optionalText(200),
});

export type BlogFields = z.infer<typeof blogFieldsSchema>;
export type GenerateBlogDraft = z.infer<typeof generateBlogDraftSchema>;
