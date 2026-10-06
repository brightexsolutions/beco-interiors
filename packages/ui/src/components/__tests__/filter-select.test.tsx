import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { FilterSelect } from '../filter-select';

const options = [
  { value: '', label: 'Any' },
  { value: 'new', label: 'New' },
  { value: 'won', label: 'Won' },
];

describe('FilterSelect', () => {
  it('draws its caption and the current value inside one control', () => {
    const { container } = render(<FilterSelect label="Status" value="won" options={options} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: 'Filter by status' });
    expect(select).toHaveValue('won');
    const label = container.querySelector('label')!;
    expect(label).toHaveTextContent(/^StatusWon/);
    // One 44px box: caption and value share the control's height.
    expect(label).toHaveClass('h-11');
  });

  it('shows the first option when the value is not one of them', () => {
    render(<FilterSelect label="Owner" value="nobody" options={[{ value: 'all', label: 'Everyone' }, ...options]} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Filter by owner' })).toHaveValue('all');
    expect(screen.getByText('Everyone', { selector: 'span' })).toBeInTheDocument();
  });

  it('reports the chosen value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterSelect label="Status" value="" options={options} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'new');
    expect(onChange).toHaveBeenCalledWith('new');
  });

  it('takes an explicit accessible name', () => {
    render(<FilterSelect label="Status" accessibleName="Article status" value="" options={options} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Article status' })).toBeInTheDocument();
  });

  it('keeps the drawn caption and value away from assistive tech, so nothing is read twice', () => {
    const { container } = render(<FilterSelect label="Status" value="new" options={options} onChange={vi.fn()} />);
    const drawn = container.querySelectorAll('label > span');
    expect(drawn).toHaveLength(2);
    for (const span of drawn) expect(span).toHaveAttribute('aria-hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FilterSelect label="Status" value="" options={options} onChange={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
