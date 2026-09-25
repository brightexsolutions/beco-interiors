import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const createStaffUser = vi.fn(async () => ({
  ok: 'Account created.',
  password: 'issued-once-password',
  userId: '11111111-1111-4111-8111-111111111111',
}));
vi.mock('@/app/(app)/users/actions', () => ({
  createStaffUser: (...a: Parameters<typeof createStaffUser>) => createStaffUser(...a),
}));

const { IssuedSecret, UserCreate } = await import('../user-create');

describe('UserCreate', () => {
  it('submits Create user with name, email and role', async () => {
    const user = userEvent.setup();
    render(<UserCreate />);
    await user.type(screen.getByLabelText('Full name'), 'Njeri Kamau');
    await user.type(screen.getByLabelText('Email'), 'njeri.kamau@beco.co.ke');
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(createStaffUser).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<UserCreate />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('IssuedSecret', () => {
  it('shows the password and a Copy password control', async () => {
    render(<IssuedSecret password="issued-once-password" />);
    expect(screen.getByLabelText('Password')).toHaveValue('issued-once-password');
    expect(screen.getByRole('button', { name: 'Copy password' })).toBeEnabled();
  });
});
