import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { DataTable, type DataTableColumn } from '../data-table';

interface Row {
  id: string;
  reference: string;
  customer: string;
  total: number;
}

const rows: Row[] = [
  { id: '1', reference: 'BEC-Q-00003', customer: 'Otieno', total: 92400 },
  { id: '2', reference: 'BEC-Q-00001', customer: 'Achieng', total: 148000 },
  { id: '3', reference: 'BEC-Q-00002', customer: 'Njoroge', total: 40000 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'reference', header: 'Reference', sortable: true, render: (r) => r.reference },
  { key: 'customer', header: 'Customer', sortable: true, render: (r) => r.customer },
  {
    key: 'total',
    header: 'Total',
    sortable: true,
    align: 'right',
    sortValue: (r) => r.total,
    render: (r) => `KES ${r.total.toLocaleString()}`,
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (r) => <a href={`/quotes/${r.reference}`}>View</a>,
  },
];

const bodyRowsText = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);

describe('DataTable', () => {
  it('renders every row and its actual data', () => {
    render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getByText('BEC-Q-00003')).toBeInTheDocument();
    expect(screen.getByText('KES 148,000')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1); // + header row
  });

  it('gives every row an explicit action, not a click-anywhere row', () => {
    render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getAllByRole('link', { name: 'View' })).toHaveLength(3);
  });

  it('sorts a sortable column, and the row order actually changes', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(bodyRowsText()).toEqual(['BEC-Q-00003', 'BEC-Q-00001', 'BEC-Q-00002']);

    await user.click(screen.getByRole('button', { name: /reference/i }));
    expect(bodyRowsText()).toEqual(['BEC-Q-00001', 'BEC-Q-00002', 'BEC-Q-00003']);
    expect(screen.getByRole('columnheader', { name: /reference/i })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /reference/i }));
    expect(bodyRowsText()).toEqual(['BEC-Q-00003', 'BEC-Q-00002', 'BEC-Q-00001']);
    expect(screen.getByRole('columnheader', { name: /reference/i })).toHaveAttribute('aria-sort', 'descending');

    // A third click returns to the original, unsorted order.
    await user.click(screen.getByRole('button', { name: /reference/i }));
    expect(bodyRowsText()).toEqual(['BEC-Q-00003', 'BEC-Q-00001', 'BEC-Q-00002']);
  });

  it('sorts numerically by sortValue, not by the rendered string', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    await user.click(screen.getByRole('button', { name: /total/i }));
    // KES 148,000 must not sort before KES 40,000 as strings would.
    const totals = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[2]!.textContent);
    expect(totals).toEqual(['KES 40,000', 'KES 92,400', 'KES 148,000']);
  });

  it('a non-sortable column renders plain text, not a button', () => {
    render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    const header = screen.getByRole('columnheader', { name: 'Actions' });
    expect(within(header).queryByRole('button')).toBeNull();
  });

  it('shows the empty state and no table body when there are no rows', () => {
    render(
      <DataTable
        caption="Quotes"
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        emptyState={<p>No quotes yet</p>}
      />,
    );
    expect(screen.getByText('No quotes yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DataTable caption="Quotes" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
