'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Button, Dialog, Field, Icon, Input, Textarea } from '@beco/ui';
import { wrapMarkdown, type MarkdownWrap } from '@/lib/markdown-format';

export function BlogBodyEditor({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLElement | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('https://');
  const selection = useRef({ start: 0, end: 0 });

  const apply = (kind: MarkdownWrap, url?: string) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? selection.current.start;
    const end = el?.selectionEnd ?? selection.current.end;
    const result = wrapMarkdown(value, start, end, kind, url);
    onChange(result.next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const remember = () => {
    const el = areaRef.current;
    if (!el) return;
    selection.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key === 'b') {
      event.preventDefault();
      apply('bold');
    }
    if (event.key === 'i') {
      event.preventDefault();
      apply('italic');
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1" role="toolbar" aria-label="Body formatting">
        <Button type="button" variant="ghost" onClick={() => apply('bold')}>
          <Icon name="bold" />
          Bold
        </Button>
        <Button type="button" variant="ghost" onClick={() => apply('italic')}>
          <Icon name="italic" />
          Italic
        </Button>
        <Button type="button" variant="ghost" onClick={() => apply('heading')}>
          <Icon name="heading" />
          Heading
        </Button>
        <Button type="button" variant="ghost" onClick={() => apply('list')}>
          <Icon name="list" />
          List
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            remember();
            setHref('https://');
            setLinkOpen(true);
          }}
        >
          <Icon name="link" />
          Link
        </Button>
      </div>
      <Textarea
        ref={areaRef}
        id={id}
        name={name}
        rows={22}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={remember}
        onKeyDown={onKeyDown}
      />
      <Dialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Insert link"
        className="h-auto max-h-[min(92dvh,24rem)] sm:h-auto"
        initialFocusRef={urlRef}
      >
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            apply('link', href);
            setLinkOpen(false);
          }}
        >
          <Field label="URL" htmlFor="blog-link-url">
            <Input
              ref={urlRef}
              id="blog-link-url"
              type="url"
              required
              value={href}
              onChange={(event) => setHref(event.target.value)}
            />
          </Field>
          <Button type="submit">Insert link</Button>
        </form>
      </Dialog>
    </div>
  );
}
