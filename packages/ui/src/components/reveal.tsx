import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The default motion everywhere: a fade and a short rise as the element
 * enters.
 *
 * A SERVER component: it renders a class and nothing else. The animation is
 * triggered by ScrollMotion setting `data-inview` as the element arrives.
 *
 * The previous version held the hidden state in React and revealed it with an
 * IntersectionObserver, which meant fourteen elements on the home page shipped
 * as `opacity-0` and depended on JavaScript arriving to become visible. That
 * is a bad trade for a marketing page: the failure mode is a blank section,
 * and it is invisible in testing because JavaScript always arrives locally.
 *
 * Now the content is visible by default and the animation is an enhancement
 * layered on top, so a browser without `animation-timeline`, a reduced-motion
 * user, and anyone whose JavaScript never runs all see the finished page.
 *
 * Transform and opacity only, so a reveal can never cost CLS.
 */
export interface RevealProps {
  children: ReactNode;
  /** Stagger, in milliseconds, matching the 60ms grid rhythm. */
  delay?: number | undefined;
  as?: 'div' | 'li' | 'section' | undefined;
  className?: string | undefined;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  return (
    <Tag
      className={cn('beco-reveal', className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
