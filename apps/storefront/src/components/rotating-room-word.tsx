'use client';

import { useEffect, useState } from 'react';

/**
 * The hero headline's own last word, cycling through the places Beco's
 * surfaces actually go, on request: "the room" is true of all of them at
 * once, but naming a few is a more concrete promise than the generic noun.
 *
 * Typed and deleted, per D92, not the rise-from-a-clipped-line entrance
 * `WordReveal` and this component both used to share. That worked once, on
 * load; replayed on every 2.2s tick it read as a mannerism rather than an
 * entrance, reported directly against the running hero. Typing is the
 * effect this word can repeat all day without wearing out its own welcome:
 * it reads as the word being written, not the same arrival replayed.
 *
 * A single `setTimeout` chain, not `setInterval`: each step schedules the
 * next one itself, so typing speed, the hold and deleting speed can each
 * own a different duration without three separate timers to keep in sync.
 * `prefers-reduced-motion` skips the whole chain, exactly like the interval
 * it replaces did, and the word holds on "room.", the one already in the
 * server rendered, JavaScript-free markup this replaces.
 *
 * The trailing period lives inside each word rather than after this
 * component, so a reader never sees a stray punctuation mark hang before
 * the incoming word has finished typing.
 */
const WORDS = ['room.', 'kitchen.', 'living room.', 'bathroom.', 'bedroom.', 'office.'];

export function RotatingRoomWord({
  holdMs = 1500,
  typeSpeedMs = 55,
  deleteSpeedMs = 30,
}: {
  /** How long the fully typed word sits before it starts deleting. */
  holdMs?: number;
  /** Milliseconds per character while typing in. */
  typeSpeedMs?: number;
  /** Milliseconds per character while deleting. */
  deleteSpeedMs?: number;
}) {
  const [shown, setShown] = useState(WORDS[0]!);

  useEffect(() => {
    if (WORDS.length < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    // WORDS[0] arrives already typed, the same server rendered word the
    // JavaScript-free markup shows, so the chain starts by holding it
    // rather than typing it a second time.
    const typeIn = (index: number) => {
      const word = WORDS[index]!;
      let length = 0;
      const step = () => {
        if (cancelled) return;
        length += 1;
        setShown(word.slice(0, length));
        timeoutId = setTimeout(length < word.length ? step : () => holdThenDelete(index), typeSpeedMs);
      };
      step();
    };

    const holdThenDelete = (index: number) => {
      timeoutId = setTimeout(() => deleteOut(index), holdMs);
    };

    const deleteOut = (index: number) => {
      const word = WORDS[index]!;
      let length = word.length;
      const step = () => {
        if (cancelled) return;
        length -= 1;
        setShown(word.slice(0, Math.max(length, 0)));
        if (length > 0) {
          timeoutId = setTimeout(step, deleteSpeedMs);
        } else {
          typeIn((index + 1) % WORDS.length);
        }
      };
      step();
    };

    // holdThenDelete already schedules the hold itself; calling it directly
    // rather than wrapping it in a second `setTimeout(..., holdMs)` here is
    // what keeps the first cycle's hold the same length as every later one.
    holdThenDelete(0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [holdMs, typeSpeedMs, deleteSpeedMs]);

  return (
    <span className="inline-flex items-baseline">
      <span>{shown}</span>
      <span
        aria-hidden
        className="beco-caret ml-[0.05em] inline-block h-[0.72em] w-[0.06em] translate-y-[0.06em] bg-current motion-reduce:hidden"
      />
    </span>
  );
}
