import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { RoomStack } from '../room-stack';

const card = (key: string, name: string) => ({
  key,
  name,
  image: <img src={`/${key}.jpg`} alt={`${name}, installed`} />,
});

describe('RoomStack', () => {
  it('the empty state: renders nothing under two cards, a stack of one is not a stack', () => {
    const { container: none } = render(<RoomStack cards={[]} />);
    expect(none.firstChild).toBeNull();
    const { container: one } = render(<RoomStack cards={[card('a', 'Amber Jade')]} />);
    expect(one.firstChild).toBeNull();
  });

  it('renders one figure per card, each naming and captioning its product', () => {
    const cards = [card('a', 'Amber Jade'), card('b', 'Pure White'), card('c', 'Onyx Black')];
    render(<RoomStack cards={cards} />);
    for (const c of cards) {
      expect(screen.getByText(c.name)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Installed')).toHaveLength(3);
  });

  it('renders the caller-supplied image node as given, so this package never learns next/image', () => {
    const cards = [card('a', 'Amber Jade'), card('b', 'Pure White')];
    render(<RoomStack cards={cards} />);
    expect(screen.getByAltText('Amber Jade, installed')).toHaveAttribute('src', '/a.jpg');
  });

  it('gives each card a static fan transform, the reduced motion state itself', () => {
    const cards = [card('a', 'Amber Jade'), card('b', 'Pure White'), card('c', 'Onyx Black')];
    const { container } = render(<RoomStack cards={cards} />);
    const figures = container.querySelectorAll('figure');
    expect(figures).toHaveLength(3);
    // Slot 0 sits flush, at the front of the fan.
    expect((figures[0] as HTMLElement).style.transform).toBe(
      'translate3d(0%, 0rem, 0) rotate(0deg) scale(1)',
    );
    // Slot 1 is offset behind it, not stacked exactly on top.
    expect((figures[1] as HTMLElement).style.transform).not.toBe(
      (figures[0] as HTMLElement).style.transform,
    );
  });

  it('has no accessibility violations', async () => {
    const cards = [card('a', 'Amber Jade'), card('b', 'Pure White')];
    const { container } = render(<RoomStack cards={cards} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
