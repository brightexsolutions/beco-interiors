'use client';

import { useEffect, useRef, useState } from 'react';
import { SHOWROOM_FILM } from '@/lib/site';

/**
 * Video in view, the sixth effect in D31's vocabulary.
 *
 * The behaviour is built in full: it autoplays muted once half of it is on
 * screen, pauses the moment it leaves so it costs nothing while it is not
 * being watched, and always carries a poster so the frame is never empty
 * while the file loads.
 *
 * No native controls for a reader who can see it autoplay, reported
 * directly as visual noise on a cinematic clip. Under
 * prefers-reduced-motion, which also turns autoplay off, controls come
 * back: without them a reader in that state would have no way to ever
 * start it at all, which is a worse outcome than the noise controls add
 * for everyone else.
 *
 * The footage is Beco's own, pulled from Drive and transcoded. Stock film of
 * someone else's kitchen was the alternative and it was the wrong one: a clip
 * that reads as Beco's work without being it is a fabricated record, on the
 * page a buyer uses to decide whether to drive there.
 *
 * Carries its own centred "BECO" watermark, low opacity, on every instance
 * rather than left to each page to repeat: the footage is easy to lift and
 * mislabel as someone else's showroom once it leaves this site, and a mark
 * baked into the frame travels with it wherever a copy ends up. `className`
 * still sizes the whole block, aspect ratio included; the video itself now
 * fills it via `absolute inset-0` so the watermark can share the same box.
 */
export function ShowroomFilm({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (reducedMotion) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Playing a video nobody is looking at burns battery and bandwidth on
        // a mobile connection, which is the connection this site is measured
        // on.
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  if (!SHOWROOM_FILM) return null;

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <video
        ref={video}
        muted
        loop
        playsInline
        controls={reducedMotion}
        preload="metadata"
        // Always set, so the frame is never empty while the file loads and the
        // section reserves its height from first paint.
        poster={SHOWROOM_FILM.poster}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={SHOWROOM_FILM.src} type={SHOWROOM_FILM.type} />
      </video>
      <p
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-display text-[20vw] leading-none tracking-[0.02em] text-high-vis-white/20 sm:text-[11vw]"
      >
        BECO
      </p>
    </div>
  );
}
