import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { PromoPopup, PromoPopupCard, type PromoPopupContent } from '../promo-popup';

const offer: PromoPopupContent = {
  variant: 'offer',
  eyebrow: 'Live offer',
  badge: '40% off',
  title: 'Selected sintered stone',
  body: 'Until the end of November.',
  cta: { label: 'Explore the stones', href: '/shop/sintered-stone' },
  images: [<img key="a" src="/a.webp" alt="Anakin" />, <img key="b" src="/b.webp" alt="Calacatta Gold" />],
};

const split: PromoPopupContent = { ...offer, variant: 'split' };

const setup = (content: PromoPopupContent = offer, onCtaClick = vi.fn()) => {
  const onOpenChange = vi.fn();
  const view = render(
    <>
      <button type="button">Opener</button>
      <PromoPopup open onOpenChange={onOpenChange} onCtaClick={onCtaClick} {...content} />
    </>,
  );
  return { onOpenChange, onCtaClick, ...view };
};

describe('PromoPopup', () => {
  it('renders nothing when closed', () => {
    render(<PromoPopup open={false} onOpenChange={() => {}} {...offer} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal named by its headline, focused itself so Close opens without a ring', async () => {
    const user = userEvent.setup();
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Selected sintered stone');
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('widens each look on a desktop, offer to 42rem and split to 56rem', () => {
    const { unmount } = setup(offer);
    expect(screen.getByRole('dialog').className).toContain('max-w-[42rem]');
    unmount();
    setup(split);
    expect(screen.getByRole('dialog').className).toContain('max-w-[56rem]');
  });

  it('Close closes, and is a 44px target', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    await user.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Escape closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('a tap on the backdrop closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    const backdrop = document.querySelector('.beco-popup-backdrop') as HTMLElement;
    await user.click(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the button goes where it says and tells the host the visitor acted', async () => {
    const user = userEvent.setup();
    const { onCtaClick } = setup();
    const link = screen.getByRole('link', { name: 'Explore the stones' });
    expect(link).toHaveAttribute('href', '/shop/sintered-stone');
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('offer shows every stone as a strip, with its badge', () => {
    setup(offer);
    const strip = screen.getByRole('list', { name: 'Stones in this offer' });
    expect(within(strip).getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('40% off')).toBeInTheDocument();
  });

  it('split shows the first stone only, and No thanks closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup(split);
    expect(screen.getByRole('img', { name: 'Anakin' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Calacatta Gold' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'No thanks' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('draws no button when there is no call to action', () => {
    setup({ ...offer, cta: null });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('has no axe violations in either look', async () => {
    const { unmount } = setup(offer);
    expect(await axe(document.body)).toHaveNoViolations();
    unmount();
    setup(split);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('PromoPopupCard', () => {
  it('as a static preview has nothing to close', () => {
    render(<PromoPopupCard {...offer} />);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByText('Selected sintered stone')).toBeInTheDocument();
  });

  it('marks its look, so a preview can be checked against the choice', () => {
    const { container, rerender } = render(<PromoPopupCard {...offer} />);
    expect(container.firstChild).toHaveAttribute('data-variant', 'offer');
    rerender(<PromoPopupCard {...split} />);
    expect(container.firstChild).toHaveAttribute('data-variant', 'split');
  });
});
