import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardDeck, type DeckCard } from '../card-deck';

/**
 * The deck is a real control, not a decorative one, per rule 3: it advances
 * the gallery and it must be operable by keyboard as well as by pointer.
 */
const cards = (n: number): DeckCard[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `c${i}`,
    node: <div data-testid={`card-${i}`} />,
    label: `Photograph ${i + 1} of ${n}`,
  }));

const setup = (n: number, active = 0) => {
  const onActiveChange = vi.fn();
  render(<CardDeck cards={cards(n)} active={active} onActiveChange={onActiveChange} />);
  return { onActiveChange };
};

describe('CardDeck', () => {
  it('advances to the next card when the deck is pressed', async () => {
    const user = userEvent.setup();
    const { onActiveChange } = setup(4);
    await user.click(screen.getByRole('button', { name: /next photograph/i }));
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it('wraps round from the last card to the first', async () => {
    const user = userEvent.setup();
    const { onActiveChange } = setup(4, 3);
    await user.click(screen.getByRole('button', { name: /next photograph/i }));
    expect(onActiveChange).toHaveBeenCalledWith(0);
  });

  it('is reachable and operable from the keyboard', async () => {
    const user = userEvent.setup();
    const { onActiveChange } = setup(3);
    await user.tab();
    expect(screen.getByRole('button', { name: /next photograph/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it('offers no control at all for a single card, rather than a dead one', () => {
    setup(1);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when it holds nothing', () => {
    const { container } = render(
      <CardDeck cards={[]} active={0} onActiveChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('announces what is now on top, so the change is not only visual', () => {
    setup(3, 1);
    expect(screen.getByText('Photograph 2 of 3')).toBeInTheDocument();
  });

  it('hides the cards behind the front one from assistive technology', () => {
    const { container } = render(
      <CardDeck cards={cards(3)} active={0} onActiveChange={() => {}} />,
    );
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    // Two cards behind the front one, plus the decorative counter.
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores a second press while a card is still in flight', async () => {
    const user = userEvent.setup();
    const { onActiveChange } = setup(4);
    const deck = screen.getByRole('button', { name: /next photograph/i });
    await user.click(deck);
    await user.click(deck);
    // The second press lands mid animation and must not skip a card.
    expect(onActiveChange).toHaveBeenCalledTimes(1);
  });
});
