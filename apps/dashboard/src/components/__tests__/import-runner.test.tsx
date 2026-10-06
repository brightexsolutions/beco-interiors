import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const startImport = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Check only started on staging.' }));
vi.mock('@/app/(app)/products/import/actions', () => ({
  startImport: (...a: Parameters<typeof startImport>) => startImport(...a),
}));

const { ImportRunner } = await import('../import-runner');

describe('ImportRunner', () => {
  beforeEach(() => startImport.mockClear());

  it('starts a check on staging straight away, with the two inputs the workflow takes', async () => {
    const user = userEvent.setup();
    render(<ImportRunner configured missing={[]} canTargetProduction />);
    await user.click(screen.getByRole('button', { name: 'Check Drive' }));
    await waitFor(() => expect(startImport).toHaveBeenCalledTimes(1));
    const form = startImport.mock.calls[0]![1];
    expect(form.get('mode')).toBe('dry-run');
    expect(form.get('target')).toBe('staging');
    expect(await screen.findByRole('status')).toHaveTextContent(/started on staging/);
  });

  it('asks before an import that writes to production, naming the live site', async () => {
    const user = userEvent.setup();
    render(<ImportRunner configured missing={[]} canTargetProduction />);
    await user.click(within(screen.getByRole('group', { name: 'What the import should do' })).getByRole('button', { name: 'Import' }));
    await user.click(within(screen.getByRole('group', { name: 'Which site' })).getByRole('button', { name: 'Production' }));
    await user.click(screen.getByRole('button', { name: 'Start import' }));
    expect(startImport).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/Import to production\?/);
    await user.click(within(dialog).getByRole('button', { name: 'Import to production' }));
    await waitFor(() => expect(startImport).toHaveBeenCalledTimes(1));
    expect(startImport.mock.calls[0]![1].get('target')).toBe('production');
  });

  it('does not ask for a check run on production: it writes nothing', async () => {
    const user = userEvent.setup();
    render(<ImportRunner configured missing={[]} canTargetProduction />);
    await user.click(within(screen.getByRole('group', { name: 'Which site' })).getByRole('button', { name: 'Production' }));
    await user.click(screen.getByRole('button', { name: 'Check Drive' }));
    await waitFor(() => expect(startImport).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('explains the hint for each mode as it is chosen', async () => {
    const user = userEvent.setup();
    render(<ImportRunner configured missing={[]} canTargetProduction />);
    expect(screen.getByText(/Writes nothing/)).toBeInTheDocument();
    await user.click(within(screen.getByRole('group', { name: 'What the import should do' })).getByRole('button', { name: 'Re-encode everything' }));
    expect(screen.getByText(/Re-downloads and re-encodes/)).toBeInTheDocument();
  });

  it('is disabled, with the reason and the terminal fallback, when GitHub is not connected', () => {
    render(<ImportRunner configured={false} missing={['GITHUB_ACTIONS_TOKEN']} canTargetProduction />);
    expect(screen.getByRole('button', { name: 'Check Drive' })).toBeDisabled();
    expect(screen.getByText(/GITHUB_ACTIONS_TOKEN not set/)).toBeInTheDocument();
    expect(screen.getByText(/pnpm drive:import/)).toBeInTheDocument();
  });

  it('shows the action\'s refusal as an alert', async () => {
    startImport.mockResolvedValueOnce({ error: 'GitHub refused the import (HTTP 403).' } as never);
    const user = userEvent.setup();
    render(<ImportRunner configured missing={[]} canTargetProduction />);
    await user.click(screen.getByRole('button', { name: 'Check Drive' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/HTTP 403/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ImportRunner configured missing={[]} canTargetProduction />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
