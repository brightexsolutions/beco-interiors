import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../confirm-dialog';

/**
 * CLAUDE.md rule 4 bans window.confirm outright, so this component IS the
 * confirmation for every destructive action in the product. It gets tested
 * like the safety control it is, not like a presentational box.
 */
const setup = (over: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Clear your quote list?"
      description="This removes all 3 items. It cannot be undone."
      confirmLabel="Clear the list"
      destructive
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onConfirm, onOpenChange };
};

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('names the thing being acted on and what happens', () => {
    setup();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Clear your quote list?');
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('puts the verb on the confirm button, never "OK"', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Clear the list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull();
  });

  it('lands focus on cancel, not on the destructive action', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('confirms only when the confirm button is pressed', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Clear the list' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without confirming', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('escape cancels, and does not confirm', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('is modal, so assistive technology does not wander into the page behind', () => {
    setup();
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('keeps tab inside the dialog', async () => {
    const user = userEvent.setup();
    setup();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Clear the list' });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    // Past the last control, focus comes back round rather than escaping to
    // the document behind.
    await user.tab();
    expect(cancel).toHaveFocus();
  });
});
