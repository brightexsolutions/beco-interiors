import { describe, expect, it } from 'vitest';
import { wrapMarkdown } from '../markdown-format';

describe('wrapMarkdown', () => {
  it('wraps a selection in bold and italic', () => {
    expect(wrapMarkdown('hello stone', 6, 11, 'bold').next).toBe('hello **stone**');
    expect(wrapMarkdown('hello stone', 6, 11, 'italic').next).toBe('hello *stone*');
  });

  it('prefixes a heading and list items', () => {
    expect(wrapMarkdown('Kitchen', 0, 7, 'heading').next).toBe('## Kitchen');
    expect(wrapMarkdown('one\ntwo', 0, 7, 'list').next).toBe('- one\n- two');
  });

  it('turns a selection into a markdown link', () => {
    expect(wrapMarkdown('Beco', 0, 4, 'link', 'https://www.beco.co.ke').next).toBe(
      '[Beco](https://www.beco.co.ke)',
    );
  });
});
