import { afterEach, describe, expect, it } from 'vitest';
import { GUIDE_TOPICS, currentGuideTopic } from '../guide';
import { TOUR_CARD_WIDTH, availableSteps, findTarget, placeCard, tourFor } from '../tour';

afterEach(() => {
  document.body.innerHTML = '';
});

const mark = (target: string, shown = true) => {
  const el = document.createElement('div');
  el.dataset.tour = target;
  el.dataset.shown = String(shown);
  document.body.append(el);
  return el;
};
const shown = (el: Element) => (el as HTMLElement).dataset.shown === 'true';

describe('tourFor, D149', () => {
  it('opens on the screen heading, from the guide topic, then the screen, then the shell', () => {
    const steps = tourFor('/quotes', currentGuideTopic('/quotes', GUIDE_TOPICS));
    expect(steps[0]).toMatchObject({ target: 'heading', title: 'Quotes' });
    expect(steps[0]!.body).toBe('Every quotation, from a website request to one raised at the counter.');
    expect(steps.map((s) => s.target)).toEqual([
      'heading',
      'filters',
      'view-switch',
      'results',
      'search',
      'nav',
      'bottom-nav',
      'new-quote',
      'guide',
    ]);
  });

  it('gives a screen without steps of its own its heading, filters and list', () => {
    const steps = tourFor('/audit', null);
    expect(steps.slice(0, 3).map((s) => s.target)).toEqual(['heading', 'filters', 'results']);
    expect(steps[0]!.title).toBe('This screen');
  });

  it('keeps every step to a short title and one or two sentences, with no em dash', () => {
    for (const path of ['/', '/quotes', '/products', '/orders']) {
      for (const step of tourFor(path, null)) {
        expect(step.title.split(' ').length).toBeLessThanOrEqual(4);
        expect(step.body.split('. ').length).toBeLessThanOrEqual(2);
        expect(step.body).not.toMatch(/\u2014/);
      }
    }
  });
});

describe('availableSteps and findTarget', () => {
  it('drops steps whose mark is missing or hidden at this width', () => {
    mark('heading');
    mark('nav', false);
    mark('bottom-nav');
    const steps = availableSteps(tourFor('/', null), shown);
    expect(steps.map((s) => s.target)).toEqual(['heading', 'bottom-nav']);
  });

  it('collapses the two Sections steps to whichever is shown', () => {
    mark('nav');
    mark('bottom-nav');
    expect(availableSteps(tourFor('/', null), shown).filter((s) => s.title === 'Sections')).toHaveLength(1);
  });

  it('finds the shown copy when the phone and the desktop each carry the mark', () => {
    mark('guide', false);
    const visible = mark('guide');
    expect(findTarget('guide', shown)).toBe(visible);
  });
});

describe('placeCard', () => {
  const viewport = { width: 1440, height: 900 };

  it('puts the card under the part when it fits', () => {
    expect(placeCard({ top: 100, left: 300, width: 400, height: 60 }, viewport, 220)).toEqual({
      side: 'below',
      top: 172,
      left: 300,
      width: TOUR_CARD_WIDTH,
    });
  });

  it('puts it over the part when there is no room under', () => {
    expect(placeCard({ top: 600, left: 300, width: 400, height: 200 }, viewport, 220)).toMatchObject({ side: 'above', top: 368 });
  });

  it('puts it beside a tall part, like the sidebar, never over it', () => {
    const place = placeCard({ top: 130, left: 0, width: 260, height: 710 }, viewport, 240);
    expect(place).toMatchObject({ side: 'right', left: 272 });
  });

  it('keeps the card on screen at the right edge', () => {
    const place = placeCard({ top: 10, left: 1300, width: 120, height: 40 }, viewport, 220);
    expect(place).toMatchObject({ side: 'below', left: 1440 - TOUR_CARD_WIDTH - 16 });
  });

  it('docks on a phone, at the edge away from the part', () => {
    expect(placeCard({ top: 780, left: 0, width: 390, height: 60 }, { width: 390, height: 844 }, 200)).toEqual({
      side: 'docked',
      edge: 'top',
      width: null,
    });
    expect(placeCard({ top: 100, left: 0, width: 390, height: 60 }, { width: 390, height: 844 }, 200)).toMatchObject({ edge: 'bottom' });
  });

  it('docks at the card width on a laptop when no side has room, so its height cannot flip', () => {
    const place = placeCard({ top: 20, left: 20, width: 1400, height: 860 }, viewport, 220);
    expect(place).toMatchObject({ side: 'docked', width: TOUR_CARD_WIDTH });
  });
});
