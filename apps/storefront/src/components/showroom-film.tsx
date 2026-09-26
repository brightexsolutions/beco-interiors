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
 * Phones are stricter than desktop. A `play()` from the intersection
 * callback is not a tap, so iOS and Android refuse it unless the element
 * is already muted and inline, and they refuse it outright in Low Power
 * Mode. A refused play used to be swallowed, which left the poster up
 * forever and no control to start it. The callback now primes those flags
 * and retries once the file can play. A later finger lift, which is a real
 * gesture, tries again. If the browser still refuses, a Play control sits
 * on the frame and starts it from that tap.
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
function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function refusalName(err: unknown) {
  if (typeof err === 'object' && err !== null && 'name' in err) return String(err.name);
  return '';
}

/** iOS will not start inline playback unless these are set before `play()`. */
function primeInline(el: HTMLVideoElement) {
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
}

export function ShowroomFilm({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

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
    if (reducedMotion || prefersReducedMotion()) return;

    let inView = false;
    let waitingForData = false;
    let cancelled = false;

    const start = () => {
      if (!inView || cancelled) return;
      primeInline(el);
      const pending = el.play();
      if (!pending || typeof pending.then !== 'function') return;
      pending.then(() => {
        if (!cancelled) setNeedsTap(false);
      }).catch((err: unknown) => {
        if (!inView || cancelled) return;
        // Not buffered yet. One retry when a frame exists, rather than
        // leaving the poster up after the first refusal.
        if (refusalName(err) !== 'NotAllowedError' && el.readyState < 2 && !waitingForData) {
          waitingForData = true;
          el.preload = 'auto';
          el.addEventListener('canplay', () => {
            waitingForData = false;
            start();
          }, { once: true });
          return;
        }
        setNeedsTap(true);
      });
    };

    const onTouchEnd = () => {
      if (inView) start();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Playing a video nobody is looking at burns battery and bandwidth on
        // a mobile connection, which is the connection this site is measured
        // on.
        inView = entry.isIntersecting;
        if (inView) {
          el.preload = 'auto';
          start();
        } else {
          el.pause();
          waitingForData = false;
          if (!cancelled) setNeedsTap(false);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      cancelled = true;
      io.disconnect();
      window.removeEventListener('touchend', onTouchEnd);
    };
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
        // Own layer, so iOS paints frames inside the overflow-hidden frame
        // rather than leaving the poster up while the file is actually playing.
        className="absolute inset-0 h-full w-full object-cover transform-gpu"
      >
        <source src={SHOWROOM_FILM.src} type={SHOWROOM_FILM.type} />
      </video>
      {needsTap ? (
        <button
          type="button"
          aria-label="Play the showroom film"
          className="absolute inset-0 z-10 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-warm-red"
          onClick={() => {
            const el = video.current;
            if (!el) return;
            primeInline(el);
            const pending = el.play();
            if (!pending || typeof pending.then !== 'function') return;
            pending.then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
          }}
        >
          <span className="flex h-11 items-center bg-high-vis-white px-4 font-ui text-base font-semibold text-charcoal">
            Play
          </span>
        </button>
      ) : null}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-display text-[20vw] leading-none tracking-[0.02em] text-high-vis-white/20 sm:text-[11vw]"
      >
        BECO
      </p>
    </div>
  );
}
