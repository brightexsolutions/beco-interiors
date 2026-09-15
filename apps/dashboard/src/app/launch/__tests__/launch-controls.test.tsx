import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { LaunchControls } from '../launch-controls';

const goLive = vi.fn(async () => ({ ok: 'live' }));
const standDown = vi.fn(async () => ({ ok: 'reverted' }));
vi.mock('../actions', () => ({
  goLive: () => goLive(),
  standDown: () => standDown(),
  saveLaunchDate: vi.fn(async () => ({})),
}));

describe('LaunchControls', () => {
  it('states the current status and target date', () => {
    render(<LaunchControls launchAt="2026-10-15T06:00:00.000Z" isLive={false} />);
    expect(screen.getByText(/Counting down/)).toBeInTheDocument();
    expect(screen.getByText(/Aiming for/)).toBeInTheDocument();
  });

  it('says plainly when no date is set', () => {
    render(<LaunchControls launchAt={null} isLive={false} />);
    expect(screen.getByText(/No date set yet/)).toBeInTheDocument();
  });

  it('does not fire the launch on the first click: it asks first', async () => {
    const user = userEvent.setup();
    render(<LaunchControls launchAt="2026-10-15T06:00:00.000Z" isLive={false} />);
    await user.click(screen.getByRole('button', { name: 'Launch the site' }));
    expect(goLive).not.toHaveBeenCalled();
    // Destructive, so ConfirmDialog renders an alertdialog.
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/Launch the Beco site/);
  });

  it('throws the switch only after the dialog is confirmed', async () => {
    const user = userEvent.setup();
    render(<LaunchControls launchAt="2026-10-15T06:00:00.000Z" isLive={false} />);
    await user.click(screen.getByRole('button', { name: 'Launch the site' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Launch the site' }));
    expect(goLive).toHaveBeenCalledOnce();
  });

  it('offers a revert instead once the site is live', () => {
    render(<LaunchControls launchAt="2026-10-15T06:00:00.000Z" isLive />);
    expect(screen.getByRole('button', { name: /Revert to the countdown/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Launch the site' })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LaunchControls launchAt={null} isLive={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
