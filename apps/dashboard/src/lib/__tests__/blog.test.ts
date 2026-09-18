import { describe, expect, it } from 'vitest';
import { extractText } from '../blog-generate';
import { readingTimeMinutes, slugFromTitle } from '../blog';

describe('blog helpers', () => {
  it('slugs a title and computes reading time from word count', () => {
    expect(slugFromTitle('Sintered Stone in Nairobi')).toBe('sintered-stone-in-nairobi');
    expect(readingTimeMinutes(Array.from({ length: 200 }, () => 'stone').join(' '))).toBe(1);
    expect(readingTimeMinutes(Array.from({ length: 401 }, () => 'stone').join(' '))).toBe(3);
  });
});

describe('extractText', () => {
  it('reads the Gemini candidate text', () => {
    expect(extractText({ candidates: [{ content: { parts: [{ text: '{"title":"A"}' }] } }] })).toBe(
      '{"title":"A"}',
    );
    expect(extractText({})).toBeNull();
  });
});
