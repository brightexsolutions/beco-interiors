import { describe, expect, it } from 'vitest';
import { createPopupSchema, updatePopupSchema } from '../dashboard-popup';

const stone = '6f1d2c0e-4a8b-4c3d-9e2f-1a2b3c4d5e6f';
const other = '7a2e3d1f-5b9c-4d4e-8f3a-2b3c4d5e6f70';

const base = {
  variant: 'offer' as const,
  eyebrow: 'Live offer',
  badge: '40% off',
  title: 'Selected sintered stone',
  body: 'Until the end of November.',
  ctaLabel: 'Explore the stones',
  ctaUrl: '/shop/sintered-stone',
  productIds: [stone, other],
  trigger: 'delay' as const,
  triggerValue: 8,
  showAgainDays: 7,
  startsAt: '2026-11-01T00:00:00.000Z',
  endsAt: '2026-11-30T00:00:00.000Z',
  priority: 0,
  isActive: 'on',
};

const issue = (input: unknown) => {
  const result = createPopupSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('createPopupSchema', () => {
  it('accepts a scheduled offer with stones and a site path button', () => {
    const result = createPopupSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.success && result.data.isActive).toBe(true);
  });

  it('reads a missing checkbox as switched off', () => {
    const { isActive: _, ...rest } = base;
    const result = createPopupSchema.safeParse(rest);
    expect(result.success && result.data.isActive).toBe(false);
  });

  it('turns blank optional copy into null', () => {
    const result = createPopupSchema.safeParse({ ...base, eyebrow: '', badge: '  ', body: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eyebrow).toBeNull();
      expect(result.data.body).toBeNull();
    }
  });

  it('refuses an end that is not after the start', () => {
    expect(issue({ ...base, endsAt: base.startsAt })).toBe('The end has to be after the start');
  });

  it('refuses half a button, either half', () => {
    expect(issue({ ...base, ctaUrl: '' })).toBe('A button needs a link');
    expect(issue({ ...base, ctaLabel: '' })).toBe('A link needs a button label');
  });

  it('refuses a link that is not a site path or http, including protocol relative', () => {
    expect(issue({ ...base, ctaUrl: 'javascript:void(0)' })).toBe('Use a site path or an http link');
    expect(issue({ ...base, ctaUrl: '//evil.example' })).toBe('Use a site path or an http link');
    expect(createPopupSchema.safeParse({ ...base, ctaUrl: 'https://wa.me/254722333730' }).success).toBe(true);
  });

  it('holds each trigger to its own range, and ignores the value on exit', () => {
    expect(issue({ ...base, trigger: 'delay', triggerValue: 121 })).toBe('Wait 0 to 120 seconds');
    expect(issue({ ...base, trigger: 'scroll', triggerValue: 5 })).toBe('Scroll 10 to 90 percent');
    expect(createPopupSchema.safeParse({ ...base, trigger: 'scroll', triggerValue: 50 }).success).toBe(true);
    expect(createPopupSchema.safeParse({ ...base, trigger: 'exit', triggerValue: 999 }).success).toBe(true);
  });

  it('needs at least one stone and allows six at most', () => {
    expect(issue({ ...base, productIds: [] })).toBe('Pick at least one stone to show');
    const seven = Array.from({ length: 7 }, (_, i) => `6f1d2c0e-4a8b-4c3d-9e2f-1a2b3c4d5e7${i}`);
    expect(issue({ ...base, productIds: seven })).toBe('Pick up to 6 stones');
  });

  it('drops a stone picked twice', () => {
    const result = createPopupSchema.safeParse({ ...base, productIds: [stone, stone, other] });
    expect(result.success && result.data.productIds).toEqual([stone, other]);
  });

  it('a section trigger needs a known section, and only it keeps one', () => {
    expect(issue({ ...base, trigger: 'section', triggerSection: '' })).toBe('Pick the section it waits for');
    expect(createPopupSchema.safeParse({ ...base, trigger: 'section', triggerSection: 'home-nowhere' }).success).toBe(false);
    const ok = createPopupSchema.safeParse({ ...base, trigger: 'section', triggerSection: 'home-showroom' });
    expect(ok.success && ok.data.triggerSection).toBe('home-showroom');
    const stale = createPopupSchema.safeParse({ ...base, trigger: 'delay', triggerSection: 'home-showroom' });
    expect(stale.success && stale.data.triggerSection).toBeNull();
  });

  it('refuses a variant or trigger the database does not know', () => {
    expect(createPopupSchema.safeParse({ ...base, variant: 'fullscreen' }).success).toBe(false);
    expect(createPopupSchema.safeParse({ ...base, trigger: 'idle' }).success).toBe(false);
  });
});

describe('updatePopupSchema', () => {
  it('needs the id, and keeps the cross field rules', () => {
    expect(updatePopupSchema.safeParse(base).success).toBe(false);
    const popupId = '8b3f4e2a-6c0d-4e5f-9a4b-3c4d5e6f7081';
    expect(updatePopupSchema.safeParse({ ...base, popupId }).success).toBe(true);
    expect(updatePopupSchema.safeParse({ ...base, popupId, endsAt: base.startsAt }).success).toBe(false);
  });
});
