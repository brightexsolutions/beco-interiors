export type MarkdownWrap = 'bold' | 'italic' | 'heading' | 'list' | 'link';

export function wrapMarkdown(
  text: string,
  start: number,
  end: number,
  kind: MarkdownWrap,
  href = '',
): { next: string; selectionStart: number; selectionEnd: number } {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.max(from, Math.min(text.length, Math.max(start, end)));
  const selected = text.slice(from, to);
  const before = text.slice(0, from);
  const after = text.slice(to);

  if (kind === 'bold') {
    const inner = selected || 'text';
    const wrapped = `**${inner}**`;
    return { next: `${before}${wrapped}${after}`, selectionStart: from + 2, selectionEnd: from + 2 + inner.length };
  }
  if (kind === 'italic') {
    const inner = selected || 'text';
    const wrapped = `*${inner}*`;
    return { next: `${before}${wrapped}${after}`, selectionStart: from + 1, selectionEnd: from + 1 + inner.length };
  }
  if (kind === 'heading') {
    const inner = selected || 'Heading';
    const prefix = before.endsWith('\n') || before === '' ? '## ' : '\n## ';
    const wrapped = `${prefix}${inner}`;
    const selStart = from + prefix.length;
    return { next: `${before}${wrapped}${after}`, selectionStart: selStart, selectionEnd: selStart + inner.length };
  }
  if (kind === 'list') {
    const block = selected || 'item';
    const lines = block.split('\n').map((line) => (line.startsWith('- ') ? line : `- ${line || 'item'}`));
    const wrapped = lines.join('\n');
    return {
      next: `${before}${wrapped}${after}`,
      selectionStart: from,
      selectionEnd: from + wrapped.length,
    };
  }
  const inner = selected || 'link';
  const url = href.trim() || 'https://';
  const wrapped = `[${inner}](${url})`;
  return { next: `${before}${wrapped}${after}`, selectionStart: from, selectionEnd: from + wrapped.length };
}
