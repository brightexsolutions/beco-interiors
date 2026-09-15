'use client';

import { useEffect, useState } from 'react';

/**
 * The hero headline's own last word, cycling through the places Beco's
 * surfaces actually go, on request: "the room" is true of all of them at
 * once, but naming a few is a more concrete promise than the generic noun.
 *
 * Reuses `beco-word`, `WordReveal`'s own rise-from-a-clipped-line keyframe,
 * rather than inventing a second text effect for one word: remounting via
 * `key` on every change replays the same entrance each time, so a reader
 * sees one consistent motion vocabulary whether the word is arriving once
 * or the fifth time. `prefers-reduced-motion` stops the interval outright,
 * the same guard every other timer-driven effect on this hero already
 * uses, and the word holds on "room", the one already in the server
 * rendered, JavaScript-free markup this replaces.
 *
 * The trailing period lives inside each word rather than after this
 * component, so a reader never sees a stray punctuation mark hang before
 * the incoming word has risen into place.
 */
const WORDS = ['room.', 'kitchen.', 'living room.', 'bathroom.', 'bedroom.', 'office.'];

export function RotatingRoomWord({ intervalMs = 2200 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (WORDS.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <span className="inline-flex overflow-hidden pb-[0.08em] align-bottom">
      <span key={index} className="beco-word inline-block">
        {WORDS[index]}
      </span>
    </span>
  );
}
