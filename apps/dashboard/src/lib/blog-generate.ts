import { findBannedBlogCopy } from '@beco/validation';

export interface GeminiDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  category: string;
  coverImageAlt: string;
  model: string;
}

const SYSTEM = `You draft blog posts for Beco Interiors, a Nairobi interior materials supplier.
House voice: short, specific, no marketing fluff.
Never use an em dash. Never use the words delve or tapestry. Never write "in today's fast paced world" or "it's not just X, it's Y".
Facts about products must only come from the catalogue context you are given. If you do not have a fact, do not invent it.
Return JSON only with keys: title, slug, excerpt, body, metaTitle, metaDescription, tags, category, coverImageAlt.
title under 60 characters. metaTitle under 60. metaDescription under 155. excerpt one or two sentences.
body is markdown with one h1 matching the title, then h2 sections. 800 to 1200 words.
author is never mentioned as AI.
slug is kebab-case.`;

export async function draftWithGemini(input: {
  brief: string;
  targetTerm: string;
  related: string | null;
  catalogue: string;
}): Promise<{ draft?: GeminiDraft; error?: string }> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  if (!key) return { error: 'Gemini is not configured. Add GEMINI_API_KEY on the dashboard.' };

  const prompt = [
    SYSTEM,
    `Target search term: ${input.targetTerm}`,
    `Brief: ${input.brief}`,
    input.related ? `Related stock the writer named: ${input.related}` : '',
    `Catalogue context:\n${input.catalogue || 'No extra catalogue rows were loaded.'}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  let payload: unknown;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      },
    );
    if (!response.ok) return { error: 'Gemini refused that draft. Try a shorter brief.' };
    payload = await response.json();
  } catch {
    return { error: 'Could not reach Gemini. Try again.' };
  }

  const text = extractText(payload);
  if (!text) return { error: 'Gemini returned an empty draft.' };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: 'Gemini returned something that was not JSON.' };
  }

  const draft: GeminiDraft = {
    title: String(parsed.title ?? '').trim(),
    slug: String(parsed.slug ?? '').trim(),
    excerpt: String(parsed.excerpt ?? '').trim(),
    body: String(parsed.body ?? '').trim(),
    metaTitle: String(parsed.metaTitle ?? '').trim(),
    metaDescription: String(parsed.metaDescription ?? '').trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag) => String(tag)) : [],
    category: String(parsed.category ?? '').trim(),
    coverImageAlt: String(parsed.coverImageAlt ?? '').trim(),
    model,
  };

  const banned = findBannedBlogCopy(
    [draft.title, draft.excerpt, draft.body, draft.metaTitle, draft.metaDescription].join('\n'),
  );
  if (banned) return { error: banned };
  if (draft.title.length < 8 || draft.body.length < 40) {
    return { error: 'That draft was too thin to use. Try a clearer brief.' };
  }
  return { draft };
}

export function extractText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return null;
  const content = (candidates[0] as { content?: { parts?: { text?: string }[] } }).content;
  const text = content?.parts?.[0]?.text;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}
