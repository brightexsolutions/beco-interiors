import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ChangePasswordForm } from '../change-password-form';

// The action talks to Supabase and redirects. Its own logic is unit tested
// in ./actions.test.ts and the RLS backstop in pgTAP.
vi.mock('../actions', () => ({ changePassword: vi.fn(async () => ({})) }));

const newPassword = () => screen.getByLabelText(/^new password/i);
const confirm = () => screen.getByLabelText(/confirm new password/i);

describe('ChangePasswordForm', () => {
  it('labels both password fields', () => {
    render(<ChangePasswordForm email="sam@beco.co.ke" />);
    expect(newPassword()).toHaveAttribute('type', 'password');
    expect(confirm()).toHaveAttribute('name', 'confirm');
  });

  it('carries a hidden username field so a password manager can file the new password', () => {
    const { container } = render(<ChangePasswordForm email="sam@beco.co.ke" />);
    const username = container.querySelector('input[name="username"]');
    expect(username).toHaveValue('sam@beco.co.ke');
    expect(username).toHaveAttribute('autocomplete', 'username');
  });

  it('asks the browser for the length floor as a UX hint', () => {
    render(<ChangePasswordForm email="sam@beco.co.ke" />);
    expect(newPassword()).toHaveAttribute('minlength', '10');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ChangePasswordForm email="sam@beco.co.ke" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
