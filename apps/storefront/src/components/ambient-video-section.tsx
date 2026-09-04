'use client';

import { useEffect, useRef } from 'react';
import { GALLERY_FILM } from '@/lib/site';

/**
 * A whole section that is just the film, running, full width, landscape.
 *
 * Every other use of Beco's own footage sits beside copy in a split layout,
 * a tall portrait frame inside a column, because all 52 of Beco's own clips
 * are portrait phone video, per D51. This section is deliberately different:
 * a full bleed landscape band, because it does not carry Beco's own footage.
 *
 * **This is licensed stock, not Beco's work, per D69.** A reversal of D51 and
 * D62 for this one section, made on direct instruction after an internal
 * reference build of the treatment was reviewed. See `GALLERY_FILM` in
 * `lib/site.ts` for the licence and the source, and D69 in
 * `docs/DECISIONS.md` for the full reasoning and what stays unchanged
 * elsewhere: the showroom split section, home and contact, is still Beco's
 * own portrait footage, untouched.
 *
 * Same battery and bandwidth discipline as `ShowroomFilm`: it plays only
 * while at least half of it is actually on screen, and stops the moment it
 * leaves. No `controls`, because this section is ambient rather than a piece
 * of content to operate, and reduced motion gets the poster frame, static,
 * with nothing autoplaying at all.
 *
 * CINEMATIC TREATMENT: the frame carries a slow continuous drift,
 * `.beco-ambient`, the same class the hero's lead card uses, so the picture
 * is gently alive rather than a still photograph that happens to loop. A
 * vignette sits at both edges, not only the bottom the caption reads
 * against, so the frame reads as graded rather than as a raw clip dropped
 * into a box.
 *
 * The VIDEO ITSELF is never delayed on arrival, the same rule that keeps a
 * hero photograph off an entrance animation: this section opens the page and
 * the poster is very likely the LCP element here, so animating its entrance
 * would be animating the thing the budget is measuring. The drift only
 * starts 1.6s after mount, well after first paint, and only the CAPTION
 * beneath it, which is not the LCP candidate, gets a scroll triggered
 * entrance.
 */
export function AmbientVideoSection({
  eyebrow, title, cta,
}: {
  eyebrow: string;
  title: string;
  cta?: { label: string; href: string };
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!GALLERY_FILM) return null;

  return (
    <section
      aria-label={title}
      // beco-ambient here, not on a wrapper: the video is a direct child,
      // which is exactly what the selector needs, and the section's own
      // overflow-hidden is what clips the drift's scale without an extra
      // element existing only to crop it.
      className="beco-ambient relative flex h-[min(78vh,44rem)] min-h-[26rem] w-full items-center justify-center overflow-hidden bg-charcoal"
    >
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="metadata"
        poster={GALLERY_FILM.poster}
        aria-hidden
        // Width led: the band's own height is what the section sets, and the
        // video fills the full width of it, object-cover taking whatever
        // crop keeps the frame full rather than letterboxed either side.
        className="h-full w-full object-cover"
      >
        <source src={GALLERY_FILM.src} type={GALLERY_FILM.type} />
      </video>

      {/* The top vignette. Purely tonal: nothing reads against it, it just
          keeps the frame from looking like a raw clip pasted into a box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-charcoal/60 to-transparent"
      />

      {/* A caption, not a wall of copy: the film is the content here, and the
          type exists only to say where it was shot and offer a way further
          in, set low so it never competes with the picture for attention.
          beco-clip/beco-wipe, not the video: the video is very likely the LCP
          element on this page, so ITS entrance is never delayed, only the
          type over it assembles on arrival. */}
      <div className="beco-clip pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 via-charcoal/25 to-transparent px-6 pb-10 pt-24 text-center">
        <div className="beco-wipe">
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-high-vis-white sm:text-4xl">
            {title}
          </h2>
          {cta ? (
            <a
              href={cta.href}
              className="pointer-events-auto mt-6 inline-block font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-4 hover:underline"
            >
              {cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
