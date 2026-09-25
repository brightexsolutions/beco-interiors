import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { DevQuickLogin } from '../dev-quick-login';

vi.mock('../actions', () => ({ devSignIn: vi.fn(async () => ({})) }));

describe('DevQuickLogin', () => {
  it('offers one control per seeded role, and each posts that role\'s email', () => {
    const { container } = render(<DevQuickLogin next="/quotes" />);
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brightex' })).toBeInTheDocument();
    expect(container.querySelector('input[name="email"][value="sam.odhiambo@beco.co.ke"]')).not.toBeNull();
    expect(container.querySelector('input[name="next"][value="/quotes"]')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DevQuickLogin next="/" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
