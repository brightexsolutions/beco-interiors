import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { QuantityStepper } from '../quantity-stepper';

describe('QuantityStepper', () => {
  it('shows the current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} label="Amber Jade" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('reports one step up when increased', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} label="Amber Jade" />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity of Amber Jade' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('reports one step down when decreased', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} label="Amber Jade" />);
    await user.click(screen.getByRole('button', { name: 'Decrease quantity of Amber Jade' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('steps by the given amount, not always by one', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} label="Amber Jade" step={0.5} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity of Amber Jade' }));
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('never reports below the floor, and disables the control there', () => {
    render(<QuantityStepper value={0.5} onChange={vi.fn()} label="Amber Jade" min={0.5} step={0.5} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity of Amber Jade' })).toBeDisabled();
  });

  it('accepts floor as an alias for min', () => {
    render(<QuantityStepper value={0.5} onChange={vi.fn()} label="Amber Jade" floor={0.5} step={0.5} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity of Amber Jade' })).toBeDisabled();
  });

  it('is not disabled above the floor', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} label="Amber Jade" min={0.5} step={0.5} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity of Amber Jade' })).not.toBeDisabled();
  });

  it('shows the unit beside the control when given one', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} label="Amber Jade" unit="per slab" />);
    expect(screen.getByText('per slab')).toBeInTheDocument();
  });

  it('renders no unit text when none is given', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} label="Amber Jade" />);
    expect(screen.queryByText('per slab')).not.toBeInTheDocument();
  });

  it('displays the value as static text, not an input, by default', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} label="Amber Jade" />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('when editable, accepts a typed value directly', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} label="Gold Bar Handle" editable />);
    const input = screen.getByLabelText('Gold Bar Handle quantity');
    fireEvent.change(input, { target: { value: '5' } });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('when editable, a value typed below the floor is clamped to it', () => {
    const onChange = vi.fn();
    render(
      <QuantityStepper value={1} onChange={onChange} label="Gold Bar Handle" editable min={1} />,
    );
    const input = screen.getByLabelText('Gold Bar Handle quantity');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('does not clip a multi digit count behind a fixed width or the browser spinner', () => {
    render(<QuantityStepper value={124} onChange={vi.fn()} label="Gold Bar Handle" editable />);
    const input = screen.getByLabelText('Gold Bar Handle quantity');
    expect((input as HTMLInputElement).value).toBe('124');
    expect(input.className).not.toMatch(/\bw-14\b/);
    expect(input.className).toContain('min-w-[3.25rem]');
    expect(input.className).toContain('[&::-webkit-inner-spin-button]:appearance-none');
  });

  it('uses a narrower input when compact', () => {
    render(<QuantityStepper value={124} onChange={vi.fn()} label="Gold Bar Handle" editable compact />);
    const input = screen.getByLabelText('Gold Bar Handle quantity');
    expect(input.className).toContain('w-[2.25rem]');
  });

  it('gives multiple instances on one page distinct, non-colliding ids', () => {
    render(
      <>
        <QuantityStepper value={1} onChange={vi.fn()} label="First" editable />
        <QuantityStepper value={1} onChange={vi.fn()} label="Second" editable />
      </>,
    );
    const first = screen.getByLabelText('First quantity') as HTMLInputElement;
    const second = screen.getByLabelText('Second quantity') as HTMLInputElement;
    expect(first.id).not.toBe(second.id);
  });

  it('has no accessibility violations, in the default and the editable shape', async () => {
    const { container, rerender } = render(
      <QuantityStepper value={2} onChange={vi.fn()} label="Amber Jade" unit="per slab" />,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(<QuantityStepper value={2} onChange={vi.fn()} label="Amber Jade" editable />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
