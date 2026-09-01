'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { ProductImage } from '@beco/types';
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
 * The source is null until Beco supplies footage, so today this renders the
 * poster on its own. That is the honest placeholder: the photograph is real,
 * and a film that read as Beco's showroom without being it would be a
 * fabricated record of a place a buyer is deciding whether to drive to.
 */
export function ShowroomFilm({ poster }: { poster: ProductImage }) {
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

  if (!SHOWROOM_FILM) {
    return (
      <div className="beco-scale-crop relative h-full w-full">
        <Image
          src={poster.path}
          alt={poster.alt}
          fill
          sizes="100vw"
          {...(poster.blur ? { placeholder: 'blur' as const, blurDataURL: poster.blur } : {})}
          className="object-cover"
        />
      </div>
    );
  }

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
      poster={poster.path}
      className="h-full w-full object-cover"
    >
      <source src={SHOWROOM_FILM.src} type={SHOWROOM_FILM.type} />
    </video>
  );
}
