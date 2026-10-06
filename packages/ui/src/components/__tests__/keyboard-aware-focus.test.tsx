import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { KeyboardAwareFocus, isTextEntry, needsScroll } from '../keyboard-aware-focus';
import { readVisualViewport } from '../../lib/use-visual-viewport';

describe('isTextEntry', () => {
  it('is true for fields that raise a keyboard, false for toggles and buttons', () => {
    const make = (html: string) => {
      const host = document.createElement('div');
      host.innerHTML = html;
      return host.firstElementChild;
    };
    expect(isTextEntry(make('<input type="text">'))).toBe(true);
    expect(isTextEntry(make('<input type="search">'))).toBe(true);
    expect(isTextEntry(make('<input type="tel">'))).toBe(true);
    expect(isTextEntry(make('<textarea></textarea>'))).toBe(true);
    expect(isTextEntry(make('<select></select>'))).toBe(true);
    expect(isTextEntry(make('<input type="checkbox">'))).toBe(false);
    expect(isTextEntry(make('<input type="radio">'))).toBe(false);
    expect(isTextEntry(make('<button>Save</button>'))).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('needsScroll', () => {
  const view = { offsetTop: 0, height: 400 };
  it('leaves a comfortably visible field alone', () => {
    expect(needsScroll({ top: 100, bottom: 144 }, view)).toBe(false);
  });
  it('scrolls a field hidden under the keyboard', () => {
    expect(needsScroll({ top: 500, bottom: 544 }, view)).toBe(true);
  });
  it('scrolls a field flush against the keyboard edge, inside the margin', () => {
    expect(needsScroll({ top: 350, bottom: 390 }, view)).toBe(true);
  });
  it('scrolls a field above the visible area once the page has shifted', () => {
    expect(needsScroll({ top: 10, bottom: 54 }, { offsetTop: 200, height: 400 })).toBe(true);
  });
});

describe('readVisualViewport', () => {
  it('reports the keyboard open only past the threshold', () => {
    expect(readVisualViewport({ height: 800, offsetTop: 0 }, 844)?.keyboardOpen).toBe(false);
    expect(readVisualViewport({ height: 420, offsetTop: 0 }, 844)?.keyboardOpen).toBe(true);
    expect(readVisualViewport(null, 844)).toBeNull();
  });
});

describe('KeyboardAwareFocus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('scrolls a focused field into view once the keyboard has settled', () => {
    render(
      <>
        <KeyboardAwareFocus />
        <input aria-label="Phone" />
      </>,
    );
    const input = document.querySelector('input')!;
    const scrollIntoView = vi.fn();
    input.scrollIntoView = scrollIntoView;
    input.getBoundingClientRect = () => ({ top: 2000, bottom: 2044 }) as DOMRect;

    act(() => input.focus());
    expect(scrollIntoView).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
  });

  it('does not move a field that is already visible', () => {
    render(
      <>
        <KeyboardAwareFocus />
        <input aria-label="Name" />
      </>,
    );
    const input = document.querySelector('input')!;
    const scrollIntoView = vi.fn();
    input.scrollIntoView = scrollIntoView;
    input.getBoundingClientRect = () => ({ top: 100, bottom: 144 }) as DOMRect;
    act(() => input.focus());
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignores a checkbox, which raises no keyboard', () => {
    render(
      <>
        <KeyboardAwareFocus />
        <input type="checkbox" aria-label="Samples" />
      </>,
    );
    const box = document.querySelector('input')!;
    const scrollIntoView = vi.fn();
    box.scrollIntoView = scrollIntoView;
    box.getBoundingClientRect = () => ({ top: 2000, bottom: 2044 }) as DOMRect;
    act(() => box.focus());
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('renders nothing', () => {
    const { container } = render(<KeyboardAwareFocus />);
    expect(container.innerHTML).toBe('');
  });
});
