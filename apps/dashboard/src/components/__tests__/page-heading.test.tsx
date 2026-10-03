import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PageHeading } from '../page-heading';

describe('PageHeading', () => {
  it('renders the title as the page heading', () => {
    render(<PageHeading title="Quotes" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Quotes' })).toBeInTheDocument();
  });

  it('shows the eyebrow and lede when given', () => {
    render(<PageHeading eyebrow="Sales" title="Quotes" lede="Everything awaiting a price." />);
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Everything awaiting a price.')).toBeInTheDocument();
  });

  it('puts actions beside the title from sm, and after the lede at full width on a phone (D112)', () => {
    const { container } = render(
      <PageHeading title="BEC-Q-00001" lede="Achieng Otieno" actions={<button type="button">View</button>} />,
    );
    const row = container.querySelector('h1')?.parentElement;
    expect(row?.className).toContain('sm:grid-cols-[minmax(0,1fr)_auto]');
    const actions = screen.getByRole('button', { name: 'View' }).parentElement;
    expect(actions?.className).toContain('order-3');
    expect(actions?.className).toContain('[&>*]:w-full');
    expect(actions?.className).toContain('sm:col-start-2');
    expect(screen.getByText('Achieng Otieno').className).toContain('order-2');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PageHeading eyebrow="Sales" title="Quotes" lede="A lede." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
