import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Notice } from '../notice';

describe('Notice', () => {
  it('renders its content', () => {
    render(<Notice>Delivery is charged separately.</Notice>);
    expect(screen.getByText('Delivery is charged separately.')).toBeInTheDocument();
  });

  it('defaults to the info tone: weight only, no fill, no announcement, so it reads correctly on any background', () => {
    render(<Notice>Priced on request.</Notice>);
    const el = screen.getByText('Priced on request.');
    expect(el.className).toContain('font-semibold');
    expect(el.className).not.toMatch(/\bbg-|\bborder-/);
    expect(el).not.toHaveAttribute('role');
  });

  it('the alert tone is announced and drawn from the functional error colour, never the brand red', () => {
    render(<Notice tone="alert">This account cannot sign in.</Notice>);
    const el = screen.getByRole('alert');
    expect(el).toHaveTextContent('This account cannot sign in.');
    expect(el.className).toContain('text-error');
    expect(el.className).not.toContain('warm-red');
  });

  it('has no accessibility violations in either tone', async () => {
    const { container, rerender } = render(<Notice>Priced on request.</Notice>);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Notice tone="alert">This account cannot sign in.</Notice>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
