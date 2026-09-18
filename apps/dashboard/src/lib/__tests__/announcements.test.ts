import { describe, expect, it } from 'vitest';
import {
  announcementWindow,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../announcements';

describe('announcementWindow', () => {
  const now = Date.parse('2026-09-18T12:00:00.000Z');

  it('is live inside the window, scheduled before, ended after, off when inactive', () => {
    expect(
      announcementWindow(
        { isActive: true, startsAt: '2026-09-18T00:00:00.000Z', endsAt: '2026-09-19T00:00:00.000Z' },
        now,
      ),
    ).toBe('live');
    expect(
      announcementWindow(
        { isActive: true, startsAt: '2026-09-19T00:00:00.000Z', endsAt: '2026-09-20T00:00:00.000Z' },
        now,
      ),
    ).toBe('scheduled');
    expect(
      announcementWindow(
        { isActive: true, startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-09-02T00:00:00.000Z' },
        now,
      ),
    ).toBe('expired');
    expect(
      announcementWindow(
        { isActive: false, startsAt: '2026-09-18T00:00:00.000Z', endsAt: '2026-09-19T00:00:00.000Z' },
        now,
      ),
    ).toBe('off');
  });
});

describe('Nairobi datetime-local', () => {
  it('round-trips a Nairobi wall time', () => {
    const local = '2026-09-19T08:00';
    const iso = fromDatetimeLocalValue(local);
    expect(iso).toBe('2026-09-19T05:00:00.000Z');
    expect(toDatetimeLocalValue(iso)).toBe(local);
  });
});
