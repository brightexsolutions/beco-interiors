'use client';

import { useActionState } from 'react';
import { Button, Field, PasswordInput } from '@beco/ui';
import { changePassword, type ChangePasswordState } from './actions';

const INITIAL: ChangePasswordState = {};

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, INITIAL);

  return (
    <form action={action} className="space-y-6">
      {/* Named so a password manager can associate the new password with the
          account. Hidden because the user is already signed in and cannot
          change it here. */}
      <input type="text" name="username" autoComplete="username" defaultValue={email} hidden readOnly />

      <Field label="New password" htmlFor="password" hint="At least 10 characters" error={state.error}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving' : 'Save password'}
      </Button>
    </form>
  );
}
