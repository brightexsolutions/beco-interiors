'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Field, FormSection, Input, Select, toast, useActionToast } from '@beco/ui';
import { createStaffUser, type UserActionState } from '@/app/(app)/users/actions';
import { STAFF_ROLE_LABEL, STAFF_ROLES } from '@/lib/users';

const INITIAL: UserActionState = {};

function IssuedSecret({ password }: { password: string }) {
  return (
    <FormSection
      title="Issued password"
      hint="Shown once. Send it out of band. They change it on first sign in. It is not stored."
    >
      <Field label="Password" htmlFor="issued-password">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input id="issued-password" readOnly value={password} className="min-w-0 font-mono" />
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(password);
                toast.success('Password copied.');
              } catch {
                toast.error('Could not copy. Select the password and copy it yourself.');
              }
            }}
          >
            Copy password
          </Button>
        </div>
      </Field>
    </FormSection>
  );
}

export function UserCreate() {
  const [state, create, pending] = useActionState(createStaffUser, INITIAL);
  const [role, setRole] = useState<(typeof STAFF_ROLES)[number]>('beco_sales');
  useActionToast(state);

  useEffect(() => {
    if (state.password) {
      const field = document.getElementById('issued-password');
      field?.scrollIntoView({ block: 'nearest' });
    }
  }, [state.password]);

  return (
    <form action={create} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
        {state.password ? <IssuedSecret password={state.password} /> : null}
        <FormSection title="Account" hint="They sign in with this email. The password is issued after save.">
          <Field label="Full name" htmlFor="new-full-name">
            <Input id="new-full-name" name="fullName" required autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="new-email">
            <Input id="new-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Role" htmlFor="new-role">
            <Select id="new-role" name="role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              {STAFF_ROLES.map((value) => (
                <option key={value} value={value}>
                  {STAFF_ROLE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
      </div>
      <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
        <Button type="submit" disabled={pending || Boolean(state.password)}>
          {pending ? 'Creating' : state.password ? 'Created' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}

export { IssuedSecret };
