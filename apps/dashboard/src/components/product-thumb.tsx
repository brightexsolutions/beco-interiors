'use client';

import { useState } from 'react';
import { cn } from '@beco/ui';
import { productImageUrl } from '@/lib/products';

/**
 * A product's first photograph at 400px, square cropped, so a list reads
 * by eye rather than by name alone. A product with no photograph, or one
 * whose image fails to load, shows its initials on a quiet tile instead of
 * a broken image icon.
 */
export function ProductThumb({
  name,
  path,
  size = 'md',
  className,
}: {
  name: string;
  path: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = size === 'sm' ? 'size-10' : 'size-14';
  const initials = name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

  if (!path || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-neutral-100 font-ui text-sm font-semibold text-neutral-500',
          box,
          className,
        )}
      >
        {initials}
      </span>
    );
  }
  return (
    <img
      src={productImageUrl(path, 400)}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-control bg-neutral-100 object-cover', box, className)}
    />
  );
}
