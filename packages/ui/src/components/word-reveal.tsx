import { cn } from '../lib/cn';

/**
 * The headline arrives word by word, rising from a clipped line.
 *
 * Used ONCE, on the home hero, and nowhere else on the site. The motion rules
 * ask for text effects used with intent, and intent means scarcity: a second
 * one of these and it stops being an entrance and becomes a mannerism.
 *
 * Pure CSS, and therefore a SERVER component. An earlier version held the
 * hidden state in React and revealed it in an effect, which meant the headline
 * was invisible until hydration: fine in a browser, but the most important
 * sentence on the site should not depend on JavaScript arriving to be seen.
 * A keyframe with `backwards` fill runs on paint whether or not React ever
 * boots, and `prefers-reduced-motion` removes it in CSS rather than in a
 * branch, so there is no flash for anyone.
 */
export interface WordRevealProps {
  text: string;
  className?: string | undefined;
  /** Milliseconds between words. */
  stagger?: number | undefined;
  delay?: number | undefined;
}

export function WordReveal({ text, className, stagger = 70, delay = 120 }: WordRevealProps) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        // The outer span clips, so each word rises out of its own line rather
        // than fading in place. Transform and opacity only, never layout.
        <span key={`${word}-${i}`} className="inline-flex overflow-hidden pb-[0.08em] align-bottom">
          <span
            className={cn('beco-word inline-block')}
            style={{ animationDelay: `${delay + i * stagger}ms` }}
          >
            {word}
          </span>
          {/* A real space, outside the clip, so words never run together. */}
          {i < words.length - 1 ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
}
