/**
 * Pure countdown math, kept apart from the component that ticks it so the
 * arithmetic is unit tested without a fake timer driving a render.
 */
export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once `target` has passed. The banner reads this as "any moment now"
      rather than counting into negative numbers. */
  reached: boolean;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const countdownTo = (target: string, now: number): CountdownParts => {
  const diff = new Date(target).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, reached: true };
  }
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
    reached: false,
  };
};
