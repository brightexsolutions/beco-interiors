import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from '../button';

describe('Button pending', () => {
  it('disables itself, says busy, and shows the spinner while the action runs', () => {
    render(<Button pending>Saving</Button>);
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('is an ordinary button when not pending, with no busy attribute and no spinner', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector('svg')).toBeNull();
  });

  it('stays disabled when the caller disabled it, pending or not', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('has no accessibility violations in either state', async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button pending>Saving</Button>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
