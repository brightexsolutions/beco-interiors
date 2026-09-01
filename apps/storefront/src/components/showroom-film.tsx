'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { SHOWROOM_FILM } from '@/lib/site';

/**
 * Video in view, the sixth effect in D31's vocabulary and the only one with no
 * content yet.
 *
 * The behaviour is built in full: it autoplays muted once half of it is on
 * screen, pauses the moment it leaves so it costs nothing while it is not
 * being watched, and always carries a poster so the frame is never empty
 * while the file loads. Under prefers-reduced-motion it does not autoplay at
 * all and the controls are the only way to start it.
 *
 * The footage is Beco's own, pulled from Drive and transcoded. Stock film of
 * someone else's kitchen was the alternative and it was the wrong one: a clip
 * that reads as Beco's work without being it is a fabricated record, on the
 * page a buyer uses to decide whether to drive there.
 */
export function ShowroomFilm({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

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
  }, []);

  if (!SHOWROOM_FILM) return null;

  return (
    <video
      ref={video}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      // Always set, so the frame is never empty while the file loads and the
      // section reserves its height from first paint.
      poster={SHOWROOM_FILM.poster}
      className={className}
    >
      <source src={SHOWROOM_FILM.src} type={SHOWROOM_FILM.type} />
    </video>
  );
}
