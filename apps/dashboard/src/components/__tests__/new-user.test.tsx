import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewUserFab } from '../new-user';

describe('NewUserFab', () => {
  it('goes to /users?new=1, floats on desktop and on a phone', () => {
    render(<NewUserFab />);
    const link = screen.getByRole('link', { name: 'New user' });
    expect(link).toHaveAttribute('href', '/users?new=1');
    expect(link.className).toContain('fixed');
    expect(link.className).toContain('bg-charcoal');
    expect(link.className).not.toContain('lg:hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewUserFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
