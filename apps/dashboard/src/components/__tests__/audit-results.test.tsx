import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AuditRow } from '@/lib/audit';

vi.mock('next/navigation', () => ({
  usePathname: () => '/audit',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const { AuditResults } = await import('../audit-results');
const { AuditFilters } = await import('../audit-filters');

const row: AuditRow = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'u1',
  actor: 'Irene Kariuki',
  action: 'update',
  entityType: 'settings',
  entityId: null,
  before: { value: 0.16 },
  after: { value: 0.18 },
  createdAt: '2026-09-18T08:00:00.000Z',
};

describe('AuditFilters', () => {
  it('has search, entity and action', () => {
    render(<AuditFilters />);
    expect(screen.getByLabelText('Search entity')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by entity')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by action')).toBeInTheDocument();
  });
});

describe('AuditResults', () => {
  it('names Actions and View, and opens the sheet from ?row=', () => {
    render(<AuditResults rows={[row]} viewing={row} />);
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Updated settings');
    expect(screen.getByRole('dialog')).toHaveTextContent('Before');
    expect(screen.getByRole('dialog')).toHaveTextContent('0.18');
  });

  it('shows settings before/after as labelled rows, not JSON', () => {
    const created: AuditRow = {
      ...row,
      action: 'create',
      actor: null,
      after: {
        key: 'send_money_number',
        value: '',
        updated_at: '2026-09-18T12:28:03.137+00:00',
        updated_by: null,
      },
      before: null,
    };
    render(<AuditResults rows={[created]} viewing={created} />);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Created settings');
    expect(sheet).toHaveTextContent('Send money number');
    expect(sheet).toHaveTextContent('None');
    expect(sheet).not.toHaveTextContent('{');
    expect(sheet).not.toHaveTextContent('send_money_number');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AuditResults rows={[row]} viewing={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
