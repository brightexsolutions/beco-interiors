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

  it('keeps actions on the same row as the title, to the right', () => {
    const { container } = render(
      <PageHeading title="BEC-Q-00001" actions={<button type="button">View</button>} />,
    );
    const row = container.querySelector('h1')?.parentElement;
    expect(row?.className).toContain('justify-between');
    expect(row?.className).toContain('items-center');
    expect(row?.className).not.toContain('flex-col');
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PageHeading eyebrow="Sales" title="Quotes" lede="A lede." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
