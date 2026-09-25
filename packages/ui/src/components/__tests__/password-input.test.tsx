import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { PasswordInput } from '../password-input';

describe('PasswordInput', () => {
  it('starts masked', () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('reveals the value when the toggle is pressed, and hides it again', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="urban-square-2026" />);
    const field = screen.getByLabelText('Password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('the toggle is a real button that never submits the form', () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByRole('button', { name: /show password/i })).toHaveAttribute('type', 'button');
  });

  it('toggles from the keyboard', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /show password/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('forwards its ref to the input and passes name and autoComplete through', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} aria-label="Password" name="password" autoComplete="current-password" />);
    expect(ref.current).toBe(screen.getByLabelText('Password'));
    expect(ref.current).toHaveAttribute('name', 'password');
    expect(ref.current).toHaveAttribute('autocomplete', 'current-password');
  });

  it('has no accessibility violations in either state', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput aria-label="Password" />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
