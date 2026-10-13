import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { SegmentedControl } from '../segmented-control';

const options = [
  { value: 'edit', label: 'Edit', icon: 'pencil' },
  { value: 'preview', label: 'Preview', icon: 'eye' },
] as const;

describe('SegmentedControl', () => {
  it('marks the chosen option pressed, inside a named group', () => {
    render(<SegmentedControl label="Mode" options={options} value="edit" onChange={() => undefined} />);
    const group = screen.getByRole('group', { name: 'Mode' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the other option when it is picked, and stays quiet on the one already chosen', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl label="Mode" options={options} value="edit" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onChange).toHaveBeenCalledWith('preview');
  });

  it('keeps every option a 44px target and draws the chosen one raised, not filled like an action', () => {
    render(<SegmentedControl label="Mode" options={options} value="preview" onChange={() => undefined} />);
    for (const button of screen.getAllByRole('button')) expect(button).toHaveClass('h-11', 'min-w-11', 'rounded-control');
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveClass('bg-high-vis-white');
    expect(screen.getByRole('button', { name: 'Preview' })).not.toHaveClass('bg-charcoal');
  });

  it('keeps the name on a phone when only the glyph shows', () => {
    render(<SegmentedControl label="View" options={options} value="edit" onChange={() => undefined} compactOnPhone />);
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-label', 'Preview');
  });

  it('works from the keyboard and has no accessibility violations', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<SegmentedControl label="Mode" options={options} value="edit" onChange={onChange} />);
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('preview');
    expect(await axe(container)).toHaveNoViolations();
  });
});
