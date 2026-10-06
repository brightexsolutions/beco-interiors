import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BusyRegion, ListRowLink, ListRows } from '../list-rows';

function Rows({ busy = false }: { busy?: boolean }) {
  return (
    <ListRows busy={busy} label="Quotes">
      <ListRowLink href="/quotes/BEC-Q-00002" label="View BEC-Q-00002, Amani Otieno" marked>
        <p>Amani Otieno</p>
      </ListRowLink>
      <ListRowLink href="/quotes/BEC-Q-00001" label="View BEC-Q-00001, Njeri Kamau">
        <p>Njeri Kamau</p>
      </ListRowLink>
    </ListRows>
  );
}

describe('ListRows', () => {
  it('is a named list of rows divided by rules, not cards, hidden from xl where the table takes over', () => {
    render(<Rows />);
    const list = screen.getByRole('list', { name: 'Quotes' });
    expect(list).toHaveClass('divide-y', 'xl:hidden');
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).not.toMatch(/rounded|border-neutral-200|shadow/);
    }
  });

  it('makes the whole row the link to its destination', () => {
    render(<Rows />);
    expect(screen.getByRole('link', { name: 'View BEC-Q-00001, Njeri Kamau' })).toHaveAttribute('href', '/quotes/BEC-Q-00001');
  });

  it('marks a row with a thin charcoal edge, and keeps the same edge transparent on the rest so text aligns', () => {
    render(<Rows />);
    const marked = screen.getByRole('link', { name: /Amani/ });
    const plain = screen.getByRole('link', { name: /Njeri/ });
    expect(marked).toHaveClass('border-l-2', 'border-l-charcoal');
    expect(marked).toHaveAttribute('data-marked', 'true');
    expect(plain).toHaveClass('border-l-2', 'border-l-transparent');
    expect(plain).not.toHaveAttribute('data-marked');
  });

  it('dims with aria-busy while busy, and not otherwise', () => {
    const { rerender } = render(<Rows />);
    const list = screen.getByRole('list', { name: 'Quotes' });
    expect(list).not.toHaveAttribute('aria-busy');
    expect(list).not.toHaveClass('opacity-50');
    rerender(<Rows busy />);
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(list).toHaveClass('opacity-50');
  });

  it('BusyRegion dims whatever stands in for the list', () => {
    const { rerender } = render(<BusyRegion>Nothing here</BusyRegion>);
    expect(screen.getByText('Nothing here')).not.toHaveAttribute('aria-busy');
    rerender(<BusyRegion busy>Nothing here</BusyRegion>);
    expect(screen.getByText('Nothing here')).toHaveAttribute('aria-busy', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Rows />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
