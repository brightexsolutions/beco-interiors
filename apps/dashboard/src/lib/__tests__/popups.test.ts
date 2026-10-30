import { describe, expect, it } from 'vitest';
import type { ProductImage } from '@beco/types';
import { POPUP_SECTION_LABEL, describeTrigger, popupMutationMessage, popupWindow, toPopupStone } from '../popups';

const img = (path: string, role: ProductImage['role'], sort = 0): ProductImage => ({
  path, alt: path, role, sort, width: 1600, height: 1000,
});

describe('describeTrigger', () => {
  it('says what opens it in a few words', () => {
    expect(describeTrigger({ trigger: 'delay', triggerValue: 8, triggerSection: null })).toBe('After 8s');
    expect(describeTrigger({ trigger: 'delay', triggerValue: 0, triggerSection: null })).toBe('At once');
    expect(describeTrigger({ trigger: 'scroll', triggerValue: 50, triggerSection: null })).toBe('At 50% scrolled');
    expect(describeTrigger({ trigger: 'exit', triggerValue: 0, triggerSection: null })).toBe('When leaving');
    expect(describeTrigger({ trigger: 'section', triggerValue: 0, triggerSection: 'home-showroom' })).toBe(
      'At Home: The showroom film',
    );
  });
});

describe('popupWindow', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  const base = { isActive: true, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-30T00:00:00Z' };
  it('reads live, scheduled, ended and off by the same rule as announcements', () => {
    expect(popupWindow(base, now)).toBe('live');
    expect(popupWindow({ ...base, startsAt: '2026-11-20T00:00:00Z' }, now)).toBe('scheduled');
    expect(popupWindow({ ...base, endsAt: '2026-11-05T00:00:00Z' }, now)).toBe('expired');
    expect(popupWindow({ ...base, isActive: false }, now)).toBe('off');
  });
});

describe('toPopupStone', () => {
  it('takes the slab for the strip and the room for the photo side', () => {
    const stone = toPopupStone({ id: 'a', name: 'Anakin', images: [img('a/room', 'application'), img('a/slab', 'slab')] });
    expect(stone).toEqual({ id: 'a', name: 'Anakin', slabPath: 'a/slab', roomPath: 'a/room' });
  });

  it('falls back to what the stone has, and to nothing with no photographs', () => {
    expect(toPopupStone({ id: 'b', name: 'B', images: [img('b/slab', 'slab')] }).roomPath).toBe('b/slab');
    expect(toPopupStone({ id: 'c', name: 'C', images: null }).slabPath).toBeNull();
  });
});

describe('popupMutationMessage', () => {
  it('names each constraint in words', () => {
    expect(popupMutationMessage({ code: '23514', message: 'violates check constraint "popups_dates"' })).toBe(
      'The end has to be after the start.',
    );
    expect(popupMutationMessage({ code: '23514', message: 'violates check constraint "popups_cta_pair"' })).toBe(
      'A button needs both a label and a link.',
    );
    expect(popupMutationMessage({ code: '42501', message: 'rls' })).toBe('You do not have permission to change pop ups.');
    expect(popupMutationMessage(null)).toBe('The database refused that write.');
  });
});

describe('POPUP_SECTION_LABEL', () => {
  it('names every section the storefront marks', async () => {
    const { POPUP_SECTIONS } = await import('@beco/types');
    expect(Object.keys(POPUP_SECTION_LABEL).sort()).toEqual([...POPUP_SECTIONS].sort());
  });
});
