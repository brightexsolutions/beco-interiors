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

const banner: PromoPopupContent = {
  variant: 'image',
  title: 'End year sale: up to 40% off sintered stones',
  cta: { label: 'Shop now', href: '/shop/sintered-stone' },
  images: [<img key="banner" src="/banner.webp" alt="End year sale: up to 40% off sintered stones" />],
};

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

  it('has no axe violations in any look', async () => {
    const { unmount } = setup(offer);
    expect(await axe(document.body)).toHaveNoViolations();
    unmount();
    const second = setup(split);
    expect(await axe(document.body)).toHaveNoViolations();
    second.unmount();
    setup(banner);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('a banner is the whole card, 60rem wide, and the picture is its button', async () => {
    const user = userEvent.setup();
    const { onCtaClick } = setup(banner);
    const dialog = screen.getByRole('dialog', { name: banner.title });
    expect(dialog.className).toContain('max-w-[60rem]');
    // The headline is for screen readers; the picture already says it.
    expect(within(dialog).getByRole('heading', { name: banner.title })).toHaveClass('sr-only');
    const link = within(dialog).getByRole('link', { name: 'Shop now' });
    expect(link).toHaveAttribute('href', '/shop/sintered-stone');
    expect(within(link).getByRole('img')).toHaveAttribute('src', '/banner.webp');
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    expect(onCtaClick).toHaveBeenCalledOnce();
  });

  it('a banner without a link is a picture, still closable', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ ...banner, cta: null });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('img')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
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
    rerender(<PromoPopupCard {...banner} />);
    expect(container.firstChild).toHaveAttribute('data-variant', 'image');
  });

  it('a banner preview before its upload says so rather than drawing nothing', () => {
    render(<PromoPopupCard {...banner} images={[]} />);
    expect(screen.getByText('No banner yet')).toBeInTheDocument();
  });
});
