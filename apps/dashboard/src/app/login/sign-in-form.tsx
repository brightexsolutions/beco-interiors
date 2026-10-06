'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Notice, PasswordInput, useKeepValuesSubmit } from '@beco/ui';
import { signIn, type SignInState } from './actions';

const INITIAL: SignInState = {};

export function SignInForm({ next, denied }: { next: string; denied: boolean }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  const onActionSubmit = useKeepValuesSubmit(action);
  const formError = state.error && !state.field ? state.error : undefined;

  return (
    <form onSubmit={onActionSubmit} className="flex flex-col gap-8" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />

      {denied ? (
        <Notice tone="alert">This account cannot sign in. Contact an administrator if that seems wrong.</Notice>
      ) : null}
      {formError ? <Notice tone="alert">{formError}</Notice> : null}

      <div className="flex flex-col gap-5">
        <Field label="Email" htmlFor="email" error={state.field === 'email' ? state.error : undefined}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" error={state.field === 'password' ? state.error : undefined}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
      </div>

      <Button type="submit" className="w-full" pending={pending}>
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
