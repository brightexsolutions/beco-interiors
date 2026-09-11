'use client';

import { useActionState } from 'react';
import { Button, Field, Input, PasswordInput } from '@beco/ui';
import { signIn, type SignInState } from './actions';

const INITIAL: SignInState = {};

export function SignInForm({ next, denied }: { next: string; denied: boolean }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      {denied ? (
        <p
          role="alert"
          className="border-l-2 border-warm-red bg-warm-red-deep/10 px-3 py-2.5 font-ui text-sm text-warm-red-deep"
        >
          This account cannot sign in. Contact an administrator if that seems wrong.
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" error={state.error}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>

      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
