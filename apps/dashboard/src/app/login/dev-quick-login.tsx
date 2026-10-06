'use client';

import { useActionState } from 'react';
import { Button, Notice } from '@beco/ui';
import { DEV_QUICK_ACCOUNTS } from '@/lib/dev-quick-login';
import { devSignIn, type SignInState } from './actions';

const INITIAL: SignInState = {};

/**
 * One-click sign in as a seeded local account. Rendered only from the login
 * page when `NODE_ENV === 'development'`. Still a real Supabase session, so
 * RLS stays the authority. Skips the first-password screen because that is
 * what made every `db reset` a two-step login during development.
 */
export function DevQuickLogin({ next }: { next: string }) {
  const [state, action, pending] = useActionState(devSignIn, INITIAL);

  return (
    <div className="mt-10 border-t border-charcoal/15 pt-8">
      <p className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Local development
      </p>
      <p className="mt-2 max-w-[40ch] font-ui text-base text-neutral-700">
        Skip the password. Lands you in as a seeded account, past the first-login screen.
      </p>
      {state.error ? (
        <Notice tone="alert" className="mt-4">
          {state.error}
        </Notice>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {DEV_QUICK_ACCOUNTS.map((account) => (
          <form key={account.email} action={action}>
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="email" value={account.email} />
            <Button type="submit" variant="outline" className="w-full" pending={pending}>
              {pending ? 'Signing in' : account.label}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
