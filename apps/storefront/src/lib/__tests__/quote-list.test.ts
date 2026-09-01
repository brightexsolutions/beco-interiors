import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addLine, clearList, lineCount, readList, removeLine, setQuantity,
  STORAGE_KEY, CHANGED_EVENT,
} from '../quote-list';

const stone = { slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab', image: '/img/a.webp' };

beforeEach(() => window.localStorage.clear());

describe('the quote list', () => {
  it('starts empty', () => {
    expect(readList()).toEqual([]);
  });

  it('survives a reload, because the list is the whole point', () => {
    addLine(stone, 2);
    // Simulates a fresh page: nothing in memory, everything read back from
    // storage. A list that does not survive a refresh is not rebuilt.
    expect(readList()).toEqual([{ ...stone, quantity: 2 }]);
  });

  it('increases an existing line rather than duplicating it', () => {
    addLine(stone, 2);
    addLine(stone, 3);
    const lines = readList();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(5);
  });

  it('keeps separate products separate', () => {
    addLine(stone);
    addLine({ ...stone, slug: 'bvlgari', name: 'Bvlgari' });
    expect(readList()).toHaveLength(2);
  });

  it('removes a line when its quantity reaches zero', () => {
    addLine(stone, 1);
    setQuantity('amber-jade', 0);
    expect(readList()).toEqual([]);
  });

  it('removes a line on request', () => {
    addLine(stone);
    addLine({ ...stone, slug: 'bvlgari', name: 'Bvlgari' });
    removeLine('amber-jade');
    expect(readList().map((l) => l.slug)).toEqual(['bvlgari']);
  });

  it('clears', () => {
    addLine(stone, 4);
    clearList();
    expect(readList()).toEqual([]);
  });

  it('counts quantities, not rows', () => {
    addLine(stone, 3);
    addLine({ ...stone, slug: 'bvlgari', name: 'Bvlgari' }, 2);
    expect(lineCount(readList())).toBe(5);
  });

  it('discards a corrupted list rather than breaking the page', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json at all');
    expect(readList()).toEqual([]);
  });

  it('discards entries that are not lines, keeping the ones that are', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ slug: 'x' }, { ...stone, quantity: 1 }, null, 'nope']),
    );
    expect(readList()).toEqual([{ ...stone, quantity: 1 }]);
  });

  it('announces a change in this tab, not only in other ones', () => {
    // `storage` fires in OTHER tabs only, so without the custom event the
    // header counter would never move in the tab being used.
    const listener = vi.fn();
    window.addEventListener(CHANGED_EVENT, listener);
    addLine(stone);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener(CHANGED_EVENT, listener);
  });
});
