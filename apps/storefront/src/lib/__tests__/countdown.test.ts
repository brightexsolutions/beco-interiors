import { describe, expect, it } from 'vitest';
import { countdownTo } from '../countdown';

describe('countdownTo', () => {
  it('splits the remaining time into days, hours, minutes and seconds', () => {
    const now = Date.parse('2026-10-01T00:00:00Z');
    const target = '2026-10-15T06:30:45Z';
    expect(countdownTo(target, now)).toEqual({
      days: 14, hours: 6, minutes: 30, seconds: 45, reached: false,
    });
  });

  it('reports reached once the target has passed, rather than going negative', () => {
    const now = Date.parse('2026-10-15T00:00:00Z');
    expect(countdownTo('2026-10-01T00:00:00Z', now)).toEqual({
      days: 0, hours: 0, minutes: 0, seconds: 0, reached: true,
    });
  });

  it('treats the exact target instant as reached, not as a zero length countdown', () => {
    const now = Date.parse('2026-10-15T00:00:00Z');
    expect(countdownTo('2026-10-15T00:00:00Z', now).reached).toBe(true);
  });

  it('treats an unparsable date as already reached rather than throwing', () => {
    expect(countdownTo('not a date', Date.now()).reached).toBe(true);
  });
});
