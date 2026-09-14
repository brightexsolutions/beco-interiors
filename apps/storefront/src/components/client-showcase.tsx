'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { PublishedClient } from '@/lib/clients';

/**
 * Named, permitted clients, credentialing the finished work in the gallery
 * above it: real jobs handed over to real businesses, not just material shot
 * in a room.
 *
 * Gated on real published rows existing at all, the same principle as D27's
 * category index: this never ships an empty "trusted by" strip. Every row
 * needs BOTH `is_published` and `has_permission`, which RLS already enforces,
 * so an empty array here means either nobody, or nobody with permission, has
 * been added yet. See docs/milestones/M4-HANDOVER.md, "Client names for the
 * projects page": none are published as of M4.
 *
 * Redesigned a second time, on request, from a static grid of every client
 * at once into a single centred quote that rotates, one at a time, the same
 * crossfade PinnedHero's own lede already uses for the same reason: several
 * quotes of different lengths sharing one box need an invisible sizer set
 * to the longest of them, or the shortest one leaves the box taller than it
 * needs and the box jumps every time a longer one takes its place. The big
 * opening mark is Cormorant's own quotation glyph, at display scale, low
 * opacity so it reads as a watermark behind the words rather than a second
 * headline.
 *
 * No manual controls: the same restraint RotatingStatement and PinnedHero's
 * own lede crossfade already hold to on this site, dots as a passive
 * progress indicator rather than a clickable control nobody asked this
 * section to have. Holds on the first client and does not cycle at all
 * under `prefers-reduced-motion`, or when there is only one to show.
 */
export function ClientShowcase({ clients }: { clients: PublishedClient[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (clients.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % clients.length), 5200);
    return () => clearInterval(id);
  }, [clients.length]);

  if (clients.length === 0) return null;

  // What each client's own block says, project standing in for a client
  // with no testimonial yet, the same fallback the previous grid used.
  const bodies = clients.map((c) => c.testimonial ?? c.project ?? '');
  const longest = [...bodies].sort((a, b) => b.length - a.length)[0];

  return (
    <section aria-labelledby="client-showcase-heading" className="mt-20 text-center">
      {/* The eyebrow is the section's only heading now, on request: the
          display heading that used to sit under it is removed rather than
          reworded. It carries the accessible name in its place, matching
          how a landmark with no visible heading is named elsewhere on the
          site. */}
      <div className="flex items-center justify-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <p
          id="client-showcase-heading"
          className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
        >
          Client feedback
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-[42rem] text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none font-display text-[6rem] leading-none text-warm-red/15 sm:text-[7rem]"
        >
          &ldquo;
        </span>

        <div className="relative">
          {/* The invisible sizer, set to the longest of the real quotes:
              what actually reserves this box's height, so the stacked,
              absolutely positioned ones below cannot shift the attribution
              and dots beneath them as the active client changes. Exactly
              the device PinnedHero's own lede crossfade already uses.
              Reported directly as the dots overlapping the name and sector
              text: this sizer reserved height for the quote alone, not for
              the attribution block underneath it, so the "relative"
              wrapper collapsed to the quote's own height and the dots,
              sitting after it in normal flow, landed on top of whichever
              client's attribution the crossfade currently had on screen.
              The reserved block below mirrors that attribution's own
              shape, an h-8 row tall enough for either a real logo or a
              name on its own, plus a sector line, so the sizer always
              covers the tallest a real client's block can actually be. */}
          <div aria-hidden className="invisible">
            <p className="font-display text-2xl italic leading-snug sm:text-3xl">
              &ldquo;{longest}&rdquo;
            </p>
            <div className="mt-6">
              <span className="mx-auto block h-8" />
              <p className="mt-1 font-ui text-xs">&nbsp;</p>
            </div>
          </div>
          {clients.map((client, i) => (
            <div
              key={client.id}
              aria-hidden={i !== active}
              className={[
                'absolute inset-x-0 top-0 transition-opacity duration-700 ease-brand',
                'motion-reduce:transition-none',
                i === active ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              <blockquote className="font-display text-2xl italic leading-snug text-charcoal sm:text-3xl">
                &ldquo;{bodies[i]}&rdquo;
              </blockquote>
              <div className="mt-6">
                {client.logo ? (
                  <Image
                    src={client.logo.path}
                    alt={client.logo.alt}
                    width={client.logo.width}
                    height={client.logo.height}
                    className="mx-auto h-8 w-auto object-contain"
                  />
                ) : (
                  <p className="font-ui text-sm font-semibold uppercase tracking-[0.1em] text-charcoal">
                    {client.name}
                  </p>
                )}
                {client.sector ? (
                  <p className="mt-1 font-ui text-xs text-neutral-500">{client.sector}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <p aria-live="polite" className="sr-only">
          {clients[active]?.name}: &ldquo;{bodies[active]}&rdquo;
        </p>

        {clients.length > 1 ? (
          <div aria-hidden className="mt-10 flex justify-center gap-1.5">
            {clients.map((client, i) => (
              <span
                key={client.id}
                className={[
                  'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                  i === active ? 'bg-warm-red' : 'bg-neutral-300',
                ].join(' ')}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
