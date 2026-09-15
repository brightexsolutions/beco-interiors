'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HoverGallery, buttonClasses } from '@beco/ui';
import { blurProps, type GalleryShot } from '@/lib/products';

const PAGE_SIZE = 12;
const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'] as const;
const FRAME = ['aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-[16/10]'] as const;
const DEPTH = ['beco-depth-1', 'beco-depth-3', 'beco-depth-2', 'beco-depth-1'] as const;

/**
 * The gallery's grid, a page at a time, with the single most fully
 * documented installation given its own feature above the rest.
 *
 * That lead spread is real proof of craft rather than a claim of it: three
 * of that installation's own real photographs shown side by side, several
 * angles of the same finished room rather than the usual one tile hiding
 * the rest behind a hover. `projects` is already sorted so this is
 * whichever real installation Beco has documented most thoroughly, not an
 * editorial pick, and it uses nothing that was not already in the data.
 *
 * The rest of the grid renders a page at a time: everything at once was
 * reported directly as too much, the same reasoning the shop's own general
 * grid was just split the same way.
 */
export function GalleryGrid({ projects }: { projects: GalleryShot[] }) {
  const lead = projects[0];
  // Only pulled out of the grid when it actually has enough real siblings to
  // fill the spread: a lead with one photograph or none would otherwise be
  // silently dropped rather than falling back into the grid like every
  // other project without one.
  const hasFeature = Boolean(lead && lead.siblings.length >= 2);
  const rest = hasFeature ? projects.slice(1) : projects;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = rest.slice(0, visible);
  const remaining = rest.length - shown.length;

  if (!lead) return null;

  return (
    <div>
      {hasFeature ? (
        <Link href={`/product/${lead.productSlug}`} className="group mb-16 block lg:mb-20">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                A closer look
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight text-charcoal sm:text-3xl">
                {lead.productName}
                <span
                  aria-hidden
                  className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                />
              </h3>
            </div>
            <span className="hidden shrink-0 font-ui text-sm font-semibold uppercase tracking-[0.1em] text-warm-red-deep sm:inline">
              See the product
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {lead.siblings.slice(0, 3).map((shot) => (
              <div key={shot.path} className="beco-clip relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                <Image
                  src={shot.path}
                  alt={shot.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  {...blurProps(shot)}
                  className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                />
              </div>
            ))}
          </div>
        </Link>
      ) : null}

      <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:gap-x-10">
        {shown.map((shot, i) => (
          <div key={shot.productSlug} className={SPAN[i % SPAN.length]}>
            <Link href={`/product/${shot.productSlug}`} className="group block">
              {/* The frame is drawn first and never moves, so nothing here
                  can shift layout. beco-clip is what the wipe rises from
                  behind. */}
              <div className={`beco-clip relative w-full bg-neutral-100 ${FRAME[i % FRAME.length]}`}>
                <div
                  className={`beco-wipe absolute inset-0 ${DEPTH[i % DEPTH.length]}`}
                  style={{ animationDelay: `${(i % 2) * 110}ms` }}
                >
                  {shot.siblings.length > 1 ? (
                    <HoverGallery
                      className="absolute inset-0"
                      frames={shot.siblings.map((sibling) => (
                        <Image
                          key={sibling.path}
                          src={sibling.path}
                          alt={sibling.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          {...blurProps(sibling)}
                          className="object-cover"
                        />
                      ))}
                    />
                  ) : (
                    <Image
                      src={shot.path}
                      alt={shot.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      {...blurProps(shot)}
                      className="object-cover"
                    />
                  )}
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                />
              </div>
              <p className="beco-plate mt-4 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                {shot.productName}
                <span
                  aria-hidden
                  className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                />
                {shot.siblings.length > 1 ? (
                  <span className="ml-3 font-normal normal-case tracking-normal text-neutral-500">
                    hover for more
                  </span>
                ) : null}
              </p>
            </Link>
          </div>
        ))}
      </div>

      {remaining > 0 ? (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className={buttonClasses({ variant: 'outline' })}
          >
            View {Math.min(remaining, PAGE_SIZE)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}
