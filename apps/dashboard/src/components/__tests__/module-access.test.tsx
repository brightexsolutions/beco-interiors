import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const setModuleGrants = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Sam Odhiambo can now see Reports.' }));
vi.mock('@/app/(app)/users/actions', () => ({
  setModuleGrants: (...a: Parameters<typeof setModuleGrants>) => setModuleGrants(...a),
}));

const { ModuleAccessEditor, ModuleAccessSummary } = await import('../module-access');

const sam = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales' as const,
  moduleGrants: ['reports'],
  updatedAt: '2026-10-12T08:00:00.000Z',
};

describe('ModuleAccessSummary', () => {
  it('names the granted sections, or says the role alone decides', () => {
    const { rerender } = render(<ModuleAccessSummary person={sam} />);
    expect(screen.getByRole('list', { name: 'Extra access' })).toHaveTextContent('Reports');
    rerender(<ModuleAccessSummary person={{ ...sam, moduleGrants: [] }} />);
    expect(screen.getByText('Role access only')).toBeInTheDocument();
  });
});

describe('ModuleAccessEditor', () => {
  it('opens a dialog listing every section, locks what the role carries, and sends the whole set', async () => {
    const user = userEvent.setup();
    render(<ModuleAccessEditor person={sam} grantable={['quotes', 'orders', 'customers', 'reports', 'products']} />);
    await user.click(screen.getByRole('button', { name: 'Edit access' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Access for Sam Odhiambo');

    const quotes = within(dialog).getByRole('checkbox', { name: /^Quotes/ });
    expect(quotes).toBeChecked();
    expect(quotes).toBeDisabled();
    expect(within(dialog).getAllByText('Included in the Sales role').length).toBeGreaterThan(0);

    const reports = within(dialog).getByRole('checkbox', { name: /^Reports/ });
    expect(reports).toBeChecked();
    expect(reports).toBeEnabled();

    const audit = within(dialog).getByRole('checkbox', { name: /^Audit/ });
    expect(audit).toBeDisabled();
    expect(within(dialog).getAllByText('Only someone who holds this can grant it').length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('checkbox', { name: /^Catalogue/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save access' }));
    expect(setModuleGrants).toHaveBeenCalled();
    const form = setModuleGrants.mock.calls.at(-1)?.[1] as FormData;
    expect(form.get('userId')).toBe(sam.id);
    expect(form.get('updatedAt')).toBe(sam.updatedAt);
    expect(form.getAll('modules')).toEqual(['products', 'reports']);
  });

  it('disables the control, with the reason, for a viewer who can grant nothing', () => {
    render(<ModuleAccessEditor person={sam} grantable={[]} />);
    expect(screen.getByRole('button', { name: 'Edit access' })).toBeDisabled();
    expect(screen.getByText('Only Brightex, or a staff manager, changes access.')).toBeInTheDocument();
  });

  it('has no accessibility violations, closed and open', async () => {
    const user = userEvent.setup();
    const { container } = render(<ModuleAccessEditor person={sam} grantable={['reports']} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Edit access' }));
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
