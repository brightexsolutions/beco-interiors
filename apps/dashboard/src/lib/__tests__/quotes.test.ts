import { describe, expect, it } from 'vitest';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, isExpired } from '../quotes';

describe('isExpired', () => {
  const today = new Date('2026-09-10T12:00:00Z');

  it('is false with no valid_until at all', () => {
    expect(isExpired(null, 'quoted', today)).toBe(false);
  });

  it('is true once the date has passed', () => {
    expect(isExpired('2026-09-01', 'quoted', today)).toBe(true);
  });

  it('is false on the day itself, the window runs to end of day', () => {
    expect(isExpired('2026-09-10', 'quoted', today)).toBe(false);
  });

  it('is false while still in the future', () => {
    expect(isExpired('2026-10-01', 'quoted', today)).toBe(false);
  });

  it('a won or lost quote is never shown as expired, it already resolved', () => {
    expect(isExpired('2026-01-01', 'won', today)).toBe(false);
    expect(isExpired('2026-01-01', 'lost', today)).toBe(false);
  });
});

describe('QUOTE_STATUS', () => {
  it('has an entry for every lifecycle state', () => {
    expect(Object.keys(QUOTE_STATUS).sort()).toEqual(['lost', 'new', 'quoted', 'reviewing', 'won']);
  });

  it('reserves the attention tone, only won/lost use non-neutral tones deliberately', () => {
    expect(QUOTE_STATUS.won.tone).toBe('positive');
    expect(QUOTE_STATUS.lost.tone).toBe('muted');
    expect(QUOTE_STATUS.new.tone).toBe('neutral');
  });
});

describe('QUOTE_SOURCE_LABEL', () => {
  it('has a human label for every source', () => {
    expect(QUOTE_SOURCE_LABEL.walk_in).toBe('Walk in');
    expect(QUOTE_SOURCE_LABEL.whatsapp).toBe('WhatsApp');
  });
});
