import { describe, expect, it } from 'vitest';
import { lineSaleLabel, percentOff, percentOffLabel } from '../sale';

describe('percentOff, D163', () => {
  it('reads the saving from the two prices', () => {
    expect(percentOff(6000, 10000)).toBe(40);
    expect(percentOff(15000, 25000)).toBe(40);
    expect(percentOffLabel(6000, 10000)).toBe('40% off');
  });

  it('rounds down, never promising more than the price gives', () => {
    expect(percentOff(6040, 10000)).toBe(39);
    expect(percentOff(9950, 10000)).toBeNull();
    expect(percentOff(9900, 10000)).toBe(1);
  });

  it('says nothing without a real saving', () => {
    expect(percentOff(10000, 10000)).toBeNull();
    expect(percentOff(12000, 10000)).toBeNull();
    expect(percentOff(null, 10000)).toBeNull();
    expect(percentOff(6000, null)).toBeNull();
    expect(percentOff(undefined, undefined)).toBeNull();
    expect(percentOff(Number.NaN, 10000)).toBeNull();
    expect(percentOff(-5, 10000)).toBeNull();
    expect(percentOffLabel(10000, 10000)).toBeNull();
  });

  it('a free item against a real price is 100% off', () => {
    expect(percentOff(0, 10000)).toBe(100);
  });

  it('never overstates the saving, across every price under a sample of compare at prices', () => {
    for (const compareAt of [1, 7, 99, 100, 101, 999, 4321, 10000, 25000, 65000, 123457]) {
      const step = Math.max(1, Math.floor(compareAt / 2000));
      for (let price = 0; price <= compareAt + 1; price += step) {
        const percent = percentOff(price, compareAt);
        if (compareAt <= price) {
          expect(percent).toBeNull();
        } else if (percent === null) {
          expect((compareAt - price) / compareAt).toBeLessThan(0.01);
        } else {
          // The price the badge implies is never below the real one.
          expect(compareAt * (1 - percent / 100)).toBeGreaterThanOrEqual(price - 1e-6);
          // And it is the largest whole percent that holds.
          expect(compareAt * (1 - (percent + 1) / 100)).toBeLessThan(price + 1e-6);
        }
      }
    }
  });
});

describe('lineSaleLabel, D163', () => {
  const kes = (n: number) => `KES ${n.toLocaleString('en-US')}`;

  it('names the was price and the saving on what the line charges', () => {
    expect(lineSaleLabel(6000, 10000, kes)).toBe('Was KES 10,000, 40% off');
    // A salesperson's further discount shows in the figure.
    expect(lineSaleLabel(5000, 10000, kes)).toBe('Was KES 10,000, 50% off');
  });

  it('says nothing for a line not yet priced, priced back to full, or with no was price', () => {
    expect(lineSaleLabel(0, 10000, kes)).toBeNull();
    expect(lineSaleLabel(10000, 10000, kes)).toBeNull();
    expect(lineSaleLabel(12000, 10000, kes)).toBeNull();
    expect(lineSaleLabel(6000, null, kes)).toBeNull();
    expect(lineSaleLabel(null, 10000, kes)).toBeNull();
  });
});
