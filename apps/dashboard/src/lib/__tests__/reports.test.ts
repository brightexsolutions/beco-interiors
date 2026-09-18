import { describe, expect, it } from 'vitest';
import { funnelTotals, parseView, reportFigures } from '../reports';

describe('parseView', () => {
  it('defaults to sales', () => {
    expect(parseView(undefined)).toBe('sales');
    expect(parseView('nope')).toBe('sales');
  });

  it('accepts products and categories', () => {
    expect(parseView('products')).toBe('products');
    expect(parseView('categories')).toBe('categories');
  });
});

describe('reportFigures', () => {
  it('is silent on conversion when nothing was raised', () => {
    expect(
      reportFigures({ period: 'This month', invoiced: 0, collected: 0, people: [] }),
    ).toEqual({ raised: 0, won: 0, conversion: null });
  });

  it('counts won of raised across the team', () => {
    expect(
      reportFigures({
        period: 'This month',
        invoiced: 1,
        collected: 1,
        people: [
          {
            id: 'a',
            full_name: 'A',
            raised: 4,
            won: 2,
            lost: 1,
            won_value: 8,
            conversion: 50,
            orders: 1,
            order_value: 8,
          },
        ],
      }),
    ).toEqual({ raised: 4, won: 2, conversion: 50 });
  });
});

describe('funnelTotals', () => {
  it('adds the funnel steps', () => {
    expect(
      funnelTotals([
        {
          id: '1',
          name: 'A',
          views: 10,
          add_to_cart: 2,
          quote_submitted: 1,
          whatsapp: 0,
          calls: 0,
          view_to_cart: 20,
          cart_to_quote: 50,
        },
        {
          id: '2',
          name: 'B',
          views: 5,
          add_to_cart: 1,
          quote_submitted: 0,
          whatsapp: 0,
          calls: 0,
          view_to_cart: 20,
          cart_to_quote: null,
        },
      ]),
    ).toEqual({ views: 15, add_to_cart: 3, quote_submitted: 1 });
  });
});
