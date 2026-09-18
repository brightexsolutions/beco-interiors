import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Sheet } from '../sheet';

const setup = (over: Partial<React.ComponentProps<typeof Sheet>> = {}) => {
  const onOpenChange = vi.fn();
  const view = render(
    <Sheet open onOpenChange={onOpenChange} title="Limestone Ivory" footer={<button type="button">Save</button>} {...over}>
      <p>Price and stock</p>
    </Sheet>,
  );
  return { onOpenChange, ...view };
};

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names itself from the product', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Limestone Ivory');
  });

  it('Close actually closes, and is a 44px target', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('min-h-11');
    await user.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('escape closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps Save in the footer, not under the scrolling body', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('states a description under the title when one is passed', () => {
    setup({ description: 'On the website' });
    expect(screen.getByText('On the website')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'sheet-description');
  });

  it('clips sideways overflow rather than scrolling the rail left and right', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('overflow-hidden');
  });

  it('is modal', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});
