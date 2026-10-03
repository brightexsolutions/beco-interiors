import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ChipGroup } from '../chip-group';

const options = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New', count: 3 },
  { value: 'won', label: 'Won' },
];

describe('ChipGroup', () => {
  it('is a named group of toggle buttons, the current one pressed', () => {
    render(<ChipGroup label="Status" options={options} value="new" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /New/ })).toHaveTextContent('New3');
  });

  it('reports the tapped value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipGroup label="Status" options={options} value="" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Won' }));
    expect(onChange).toHaveBeenCalledWith('won');
  });

  it('clears to the given value when the active chip is tapped again', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipGroup label="Status" options={options} value="won" clearValue="" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Won' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('keeps every chip a 44px target', () => {
    render(<ChipGroup label="Status" options={options} value="" onChange={vi.fn()} />);
    for (const chip of screen.getAllByRole('button')) expect(chip.className).toContain('min-h-11');
  });

  it('is axe clean', async () => {
    const { container } = render(<ChipGroup label="Status" options={options} value="" onChange={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
