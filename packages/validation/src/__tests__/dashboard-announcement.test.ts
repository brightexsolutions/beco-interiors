import { describe, expect, it } from 'vitest';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../dashboard-announcement';

const base = {
  title: 'Mid year sale',
  body: 'Selected slabs.',
  type: 'sale' as const,
  ctaLabel: 'Shop stone',
  ctaUrl: '/shop',
  startsAt: '2026-09-19T00:00:00.000Z',
  endsAt: '2026-09-30T00:00:00.000Z',
  priority: 2,
  isActive: true,
};

describe('createAnnouncementSchema', () => {
  it('accepts a scheduled sale with a site-path CTA', () => {
    expect(createAnnouncementSchema.safeParse(base).success).toBe(true);
  });

  it('refuses an end that is not after the start', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
  });

  it('refuses a call to action without a URL, and a URL without a label', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, ctaUrl: '' }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...base, ctaLabel: '' }).success).toBe(false);
  });

  it('allows neither CTA field', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, ctaLabel: '', ctaUrl: '' }).success).toBe(true);
  });
});

describe('updateAnnouncementSchema', () => {
  it('needs the id', () => {
    expect(updateAnnouncementSchema.safeParse(base).success).toBe(false);
    expect(
      updateAnnouncementSchema.safeParse({
        ...base,
        announcementId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });
});
