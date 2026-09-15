import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { RangeCardGrid, type RangeCardItem } from '../range-card-grid';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, addEventListener() {}, removeEventListener() {},
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const item = (over: Partial<RangeCardItem> & Pick<RangeCardItem, 'title'>): RangeCardItem => ({
  body: 'Body copy for the range.', href: '/shop/example', ...over,
});

describe('RangeCardGrid', () => {
  it('renders a real link for a range with somewhere to send a reader', () => {
    render(<RangeCardGrid items={[item({ title: 'Sintered Stone', href: '/shop/sintered-stone' })]} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/shop/sintered-stone');
    expect(link).toHaveTextContent('Sintered Stone');
  });

  it('renders no link at all for a range with nothing published yet, not a dead one', () => {
    render(<RangeCardGrid items={[item({ title: 'SPC Flooring', href: null })]} />);
    expect(screen.queryByRole('link')).toBeNull();
    // Twice: the caption heading and the fallback plate both carry the
    // name, per the plate test below.
    expect(screen.getAllByText('SPC Flooring').length).toBe(2);
  });

  it('falls back to a name plate when no photograph is given', () => {
    render(<RangeCardGrid items={[item({ title: 'Wall Panels', href: null })]} />);
    expect(screen.getAllByText('Wall Panels').length).toBe(2);
  });

  it('renders the given image instead of the name plate when one is set', () => {
    render(
      <RangeCardGrid
        items={[item({ title: 'Sintered Stone', image: <img src="/a.webp" alt="A finished kitchen" /> })]}
      />,
    );
    expect(screen.getByAltText('A finished kitchen')).toBeInTheDocument();
    expect(screen.getAllByText('Sintered Stone').length).toBe(1);
  });

  it('does not cycle multiple real photographs on its own, on a device that can hover', () => {
    // Direct feedback: this used to autoplay unconditionally. A card that
    // can hover should behave exactly like a product card's own gallery,
    // only cycling while the pointer is actually on it.
    render(
      <RangeCardGrid
        items={[item({
          title: 'Sintered Stone',
          images: [<img key="a" alt="Frame A" />, <img key="b" alt="Frame B" />],
        })]}
      />,
    );
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('cycles multiple real photographs while the card is hovered', () => {
    const { container } = render(
      <RangeCardGrid
        items={[item({
          title: 'Sintered Stone',
          images: [<img key="a" alt="Frame A" />, <img key="b" alt="Frame B" />],
        })]}
      />,
    );
    fireEvent.mouseEnter(container.querySelector('.absolute.inset-0')!);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByAltText('Frame B').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('cycles multiple real photographs on its own when autoplay is requested', () => {
    // The reversal of the test above, on later request: a caller can opt
    // every card on the page into the always-on behaviour a touch device
    // already gets, rather than waiting on a hover that a reader who never
    // pauses over the card will never trigger.
    render(
      <RangeCardGrid
        autoplay
        items={[item({
          title: 'Sintered Stone',
          images: [<img key="a" alt="Frame A" />, <img key="b" alt="Frame B" />],
        })]}
      />,
    );
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByAltText('Frame B').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('falls back to the single image when only one is given in the images array', () => {
    render(
      <RangeCardGrid items={[item({ title: 'Knobs', images: [<img key="a" alt="Only frame" />] })]} />,
    );
    expect(screen.getByAltText('Only frame')).toBeInTheDocument();
    // Not wrapped in HoverGallery's own dot row for a single frame.
    expect(document.querySelector('.pointer-events-none.absolute.inset-x-3')).toBeNull();
  });

  it('has no accessibility violations, linked and unlinked alike', async () => {
    // axe's own internals await real timers: fake ones, still active from
    // this file's autoplay tests, hang it rather than fail it.
    vi.useRealTimers();
    const { container } = render(
      <RangeCardGrid
        items={[
          item({ title: 'Sintered Stone', href: '/shop/sintered-stone' }),
          item({ title: 'SPC Flooring', href: null }),
        ]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
