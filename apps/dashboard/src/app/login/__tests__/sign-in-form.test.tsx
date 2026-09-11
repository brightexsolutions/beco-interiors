import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SignInForm } from '../sign-in-form';

// The action talks to Supabase and redirects, neither of which belongs in a
// jsdom render. Its own guard is unit tested through signInSchema, and the
// RLS backstop through pgTAP.
vi.mock('../actions', () => ({ signIn: vi.fn(async () => ({})) }));

describe('SignInForm', () => {
  it('labels both fields so each is reachable by name', () => {
    render(<SignInForm next="/launch" denied={false} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('carries the return path as a hidden field', () => {
    const { container } = render(<SignInForm next="/launch" denied={false} />);
    expect(container.querySelector('input[name="next"]')).toHaveValue('/launch');
  });

  it('explains a rejected account rather than a bare failure', () => {
    render(<SignInForm next="/" denied />);
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot sign in/i);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SignInForm next="/launch" denied={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
