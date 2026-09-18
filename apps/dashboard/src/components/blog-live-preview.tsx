import { coverPreviewUrl, type StaffBlogPost } from '@/lib/blog';

function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          className="font-semibold text-charcoal underline decoration-warm-red underline-offset-4"
        >
          {link[1]}
        </a>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-charcoal">
          {bold[1]}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function MarkdownBody({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, index) => {
        const line = block.trim();
        if (!line) return null;
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="mt-4 font-display text-4xl leading-[1.05] text-charcoal sm:text-5xl">
              {renderInline(line.slice(2))}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="mt-10 font-display text-2xl leading-tight text-charcoal first:mt-0">
              {renderInline(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="mt-8 font-display text-xl leading-tight text-charcoal">
              {renderInline(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          const items = line.split('\n').filter((row) => row.startsWith('- '));
          return (
            <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-base leading-[1.65] text-neutral-700 lg:text-lg">
              {items.map((item) => (
                <li key={item}>{renderInline(item.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="mt-4 text-base leading-[1.65] text-neutral-700 lg:text-lg">
            {renderInline(line.replace(/\n/g, ' '))}
          </p>
        );
      })}
    </>
  );
}

export function BlogLivePreview({
  title,
  body,
  excerpt,
  category,
  author,
  coverSrc,
  coverAlt,
  readingTime,
}: {
  title: string;
  body: string;
  excerpt: string;
  category: string;
  author: string;
  coverSrc: string | null;
  coverAlt: string;
  readingTime: number | null;
}) {
  return (
    <article className="bg-high-vis-white px-6 py-10">
      <div className="mx-auto w-full max-w-[68ch]">
      {category ? (
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{category}</p>
      ) : null}
      <h1 className="mt-4 font-display text-4xl leading-[1.05] text-charcoal sm:text-5xl">{title || 'Title'}</h1>
      <p className="mt-4 font-ui text-sm text-neutral-500">
        {author || 'Author'}
        {readingTime ? <> &middot; {readingTime} min read</> : null}
      </p>
      {coverSrc ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-neutral-100">
          <img src={coverSrc} alt={coverAlt} className="h-full w-full object-cover" />
        </div>
      ) : null}
      {excerpt ? <p className="mt-8 text-base text-neutral-700 lg:text-lg">{excerpt}</p> : null}
      <div className="mt-2">
        <MarkdownBody source={body || 'The article body will appear here.'} />
      </div>
      </div>
    </article>
  );
}

export function blogPreviewProps(post: StaffBlogPost) {
  return {
    title: post.title,
    body: post.body,
    excerpt: post.excerpt ?? '',
    category: post.category ?? '',
    author: post.author,
    coverSrc: coverPreviewUrl(post.coverImage),
    coverAlt: post.coverImageAlt ?? '',
    readingTime: post.readingTime,
  };
}
