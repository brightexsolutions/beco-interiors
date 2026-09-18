import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Toaster, toast, useActionToast } from '../toaster';

afterEach(() => {
  toast.dismiss();
});

function Trigger({ onFire }: { onFire: () => void }) {
  return (
    <>
      <Toaster />
      <button type="button" onClick={onFire}>
        Fire
      </button>
    </>
  );
}

function ActionProbe({ state }: { state: { error?: string; ok?: string } }) {
  useActionToast(state);
  return <Toaster />;
}

describe('toast', () => {
  it('success is labelled Done, drawn from the functional success token, never Warm Red', async () => {
    const user = userEvent.setup();
    render(<Trigger onFire={() => toast.success('This quote is now yours.')} />);
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    const card = await screen.findByRole('status');
    expect(card).toHaveAccessibleName(/done\. this quote is now yours/i);
    expect(card).toHaveTextContent(/^Done/);
    expect(card).toHaveTextContent('This quote is now yours.');
    expect(card).toHaveAttribute('data-tone', 'success');
    expect(card.className).toContain('bg-high-vis-white');
    expect(card.className).toContain('rounded-panel');
    expect(card.className).not.toMatch(/bg-success/);
    expect(card.className).not.toContain('warm-red');
    expect(screen.getByText('Done').className).toContain('text-success');
  });

  it('error is labelled Failed, announced as an alert, from the functional error token', async () => {
    const user = userEvent.setup();
    render(
      <Trigger onFire={() => toast.error('This quote changed while you were editing. Reload and try again.')} />,
    );
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    const card = await screen.findByRole('alert');
    expect(card).toHaveTextContent(/^Failed/);
    expect(card).toHaveTextContent(/reload and try again/i);
    expect(card).toHaveAttribute('data-tone', 'error');
    expect(card.className).toContain('bg-high-vis-white');
    expect(card.className).not.toMatch(/bg-error/);
    expect(screen.getByText('Failed').className).toContain('text-error');
  });

  it('info is labelled Note, for a fact that is neither success nor failure', async () => {
    const user = userEvent.setup();
    render(<Trigger onFire={() => toast.info('Download the file to send it on WhatsApp.')} />);
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent(/^Note/);
    expect(card).toHaveAttribute('data-tone', 'info');
    expect(card.className).toContain('bg-high-vis-white');
    expect(card).toHaveTextContent(/whatsapp/i);
  });

  it('Dismiss actually removes the toast', async () => {
    const user = userEvent.setup();
    render(<Trigger onFire={() => toast.success('Item updated.')} />);
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    expect(await screen.findByText('Item updated.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Item updated.')).toBeNull());
  });

  it('useActionToast toasts ok as Done and error as Failed', async () => {
    const { rerender } = render(<ActionProbe state={{}} />);
    rerender(<ActionProbe state={{ ok: 'This quote is now yours.' }} />);
    expect(await screen.findByRole('status')).toHaveTextContent('This quote is now yours.');
    rerender(<ActionProbe state={{ error: 'You do not have permission to change this quote.' }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/i);
  });

  it('the same success message updates rather than stacking', async () => {
    const user = userEvent.setup();
    render(<Trigger onFire={() => toast.success('This quote is now yours.')} />);
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('dashboard placement is below the chrome and centered on the panel', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster position="top-center" offset={{ top: '8.5rem' }} />
        <button type="button" onClick={() => toast.success('Item updated.')}>
          Fire
        </button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    await screen.findByRole('status');
    const toaster = document.querySelector('[data-sonner-toaster]');
    expect(toaster).toHaveAttribute('data-x-position', 'center');
    expect(toaster).toHaveAttribute('data-y-position', 'top');
  });

  it('is axe clean with a toast on screen', async () => {
    const user = userEvent.setup();
    const { container } = render(<Trigger onFire={() => toast.success('Marked as quoted.')} />);
    await user.click(screen.getByRole('button', { name: 'Fire' }));
    await screen.findByRole('status');
    expect(await axe(container)).toHaveNoViolations();
  });
});
