'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@beco/ui';
import { signIn, type SignInState } from './actions';

const INITIAL: SignInState = {};

export function SignInForm({ next, denied }: { next: string; denied: boolean }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {denied ? (
        <p role="alert" className="rounded-[2px] bg-warm-red-deep/10 px-3 py-2 font-ui text-sm text-warm-red-deep">
          That account cannot use the launch control. Sign in with a Beco admin account.
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" error={state.error}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
