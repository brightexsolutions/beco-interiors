'use client';

import { useEffect, useRef } from 'react';
import { SHOWROOM_FILM } from '@/lib/site';

/**
 * A whole section that is just the film, running.
 *
 * Every other use of the showroom footage sits beside copy in a split layout,
 * `aspect-[9/16]` inside a column. This one gives the video the section to
 * itself: nearly the full viewport height, nothing sharing the frame with it,
 * so it reads as a considered cinematic moment rather than as an illustration
 * next to a paragraph.
 *
 * **Still framed to the footage's own shape, not stretched to fill the
 * viewport's.** All of Beco's clips are portrait phone video, per D51.
 * Cropping 9:16 into a wide full bleed band would throw away most of the
 * picture, so the frame stays tall and centred, on a charcoal ground either
 * side, rather than pretending the source is something it is not.
 *
 * No stock footage stands in for a second clip. D51 already rejected that:
 * a clip that reads as Beco's work without being it is a fabricated record on
 * a page a buyer uses to decide whether to drive there. When more of the 52
 * clips in Drive are transcoded, per the M4 handover, this section is where a
 * short rotation between them belongs. Today it is one film, looping, because
 * one real film is worth more than several borrowed ones.
 *
 * Same battery and bandwidth discipline as `ShowroomFilm`: it plays only
 * while at least half of it is actually on screen, and stops the moment it
 * leaves. No `controls`, because this section is ambient rather than a piece
 * of content to operate, and reduced motion gets the poster frame, static,
 * with nothing autoplaying at all.
 *
 * CINEMATIC TREATMENT, on the same real footage rather than new footage:
 * the frame carries a slow continuous drift, `.beco-ambient`, the same
 * class the hero's lead card uses, so the picture is gently alive rather
 * than a still photograph that happens to loop. A vignette sits at both
 * edges, not only the bottom the caption reads against, so the frame reads
 * as graded rather than as a raw clip dropped into a box.
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

  if (!SHOWROOM_FILM) return null;

  return (
    <section
      aria-label={title}
      // beco-ambient here, not on a wrapper: the video is a direct child,
      // which is exactly what the selector needs, and the section's own
      // overflow-hidden is what clips the drift's scale without an extra
      // element existing only to crop it.
      className="beco-ambient relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-charcoal py-16"
    >
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="metadata"
        poster={SHOWROOM_FILM.poster}
        aria-hidden
        // Height led rather than width led: at min(88vh, ...) the frame is
        // driven by how tall the section is, and the 9:16 ratio derives the
        // width from that, which is what keeps a portrait clip looking
        // intentional on a wide desktop viewport instead of stretched.
        className="h-[min(88vh,54rem)] w-auto max-w-full object-cover shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
      >
        <source src={SHOWROOM_FILM.src} type={SHOWROOM_FILM.type} />
      </video>

      {/* The top vignette. Purely tonal: nothing reads against it, it just
          keeps the frame from looking like a raw clip pasted into a box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-charcoal/70 to-transparent"
      />

      {/* A caption, not a wall of copy: the film is the content here, and the
          type exists only to say where it was shot and offer a way further
          in, set low so it never competes with the picture for attention.
          beco-clip/beco-wipe, not the video: the video is very likely the LCP
          element on this page, so ITS entrance is never delayed, only the
          type over it assembles on arrival. */}
      <div className="beco-clip pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent px-6 pb-10 pt-24 text-center">
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
