import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QuantityStepper } from '../quantity-stepper';

/** A thin controlled wrapper, since the component itself owns no state. */
function Controlled({ start, step, floor }: { start: number; step: number; floor: number }) {
  const [value, setValue] = useState(start);
  return <QuantityStepper value={value} onChange={setValue} step={step} floor={floor} />;
}

describe('QuantityStepper', () => {
  it('increases and decreases by the given step', async () => {
    const user = userEvent.setup();
    render(<Controlled start={1} step={1} floor={1} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('steps in halves when the caller asks for it', async () => {
    const user = userEvent.setup();
    render(<Controlled start={1} step={0.5} floor={0.5} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
  });

  it('disables the decrease button exactly at the floor, never below it', async () => {
    const user = userEvent.setup();
    render(<Controlled start={0.5} step={0.5} floor={0.5} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    expect(decrease).toBeDisabled();
    await user.click(decrease);
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
  });

  it('does not let the number field itself go below the floor', () => {
    // fireEvent.change over userEvent.type: this is a controlled number
    // input, clamped on every change, so simulating the single resulting DOM
    // event is what actually exercises that clamp. Typing it out key by key
    // fights the very re-render the clamp causes, which tests the browser's
    // own number input quirks rather than this component's logic.
    render(<Controlled start={2} step={1} floor={1} />);
    const input = screen.getByDisplayValue('2');
    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('gives multiple instances on one page distinct, non-colliding ids', () => {
    render(
      <>
        <QuantityStepper value={1} onChange={() => {}} step={1} floor={1} label="First" />
        <QuantityStepper value={1} onChange={() => {}} step={1} floor={1} label="Second" />
      </>,
    );
    const first = screen.getByLabelText('First') as HTMLInputElement;
    const second = screen.getByLabelText('Second') as HTMLInputElement;
    expect(first.id).not.toBe(second.id);
  });
});
