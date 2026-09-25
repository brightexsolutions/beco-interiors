import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { RangePillarList, type RangePillarItem } from '../range-pillar-list';

const item = (over: Partial<RangePillarItem> & Pick<RangePillarItem, 'title'>): RangePillarItem => ({
  body: 'Body copy for the range.', href: '/shop/example', ...over,
});

describe('RangePillarList', () => {
  it('numbers each row from 01, in the order given', () => {
    render(
      <RangePillarList items={[item({ title: 'Sintered Stone' }), item({ title: 'Lighting' })]} />,
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('renders a real link for a range with somewhere to send a reader', () => {
    render(<RangePillarList items={[item({ title: 'Sintered Stone', href: '/shop/sintered-stone' })]} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/shop/sintered-stone');
    expect(link).toHaveTextContent('Sintered Stone');
  });

  it('renders no link at all for a range with nothing published yet, not a dead one', () => {
    render(<RangePillarList items={[item({ title: 'SPC Flooring', href: null })]} />);
    expect(screen.queryByRole('link')).toBeNull();
    // Twice: the heading and the fallback plate both carry the name, per
    // the plate test below.
    expect(screen.getAllByText('SPC Flooring').length).toBe(2);
  });

  it('falls back to a name plate when no photograph is given', () => {
    render(<RangePillarList items={[item({ title: 'Wall Panels', href: null })]} />);
    // The plate repeats the title inside the visual slot, so it appears
    // twice: once as the heading, once as the plate label.
    expect(screen.getAllByText('Wall Panels').length).toBe(2);
  });

  it('renders the given image instead of the name plate when one is set', () => {
    render(
      <RangePillarList
        items={[item({ title: 'Sintered Stone', image: <img src="/a.webp" alt="A finished kitchen" /> })]}
      />,
    );
    expect(screen.getByAltText('A finished kitchen')).toBeInTheDocument();
    // Only the heading now, the plate's own duplicate label is gone.
    expect(screen.getAllByText('Sintered Stone').length).toBe(1);
  });

  it('has no accessibility violations, linked and unlinked alike', async () => {
    const { container } = render(
      <RangePillarList
        items={[
          item({ title: 'Sintered Stone', href: '/shop/sintered-stone' }),
          item({ title: 'SPC Flooring', href: null }),
        ]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
