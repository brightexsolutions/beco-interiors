'use client';

import { useActionState, useState } from 'react';
import { ConfirmDialog, FormSection, useActionToast } from '@beco/ui';
import { setStaffGrant, type SettingsActionState } from '@/app/(app)/settings/actions';
import type { GrantStaffRow } from '@/lib/settings';

const INITIAL: SettingsActionState = {};

const GRANT_COPY = {
  can_read_audit: {
    allow: 'Allow audit',
    remove: 'Remove audit',
    allowTitle: 'Allow audit access',
    removeTitle: 'Remove audit access',
    allowBody: (name: string) => `${name} will be able to read the audit log.`,
    removeBody: (name: string) => `${name} will no longer see the audit log.`,
  },
} as const;

function GrantButton({
  person,
  grant,
  enabled,
}: {
  person: GrantStaffRow;
  grant: keyof typeof GRANT_COPY;
  enabled: boolean;
}) {
  const copy = GRANT_COPY[grant];
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(setStaffGrant, INITIAL);
  useActionToast(state);
  const label = enabled ? copy.remove : copy.allow;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="h-11 px-3 font-ui text-base text-charcoal underline-offset-4 hover:underline disabled:opacity-50"
      >
        {label}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={enabled ? copy.removeTitle : copy.allowTitle}
        description={enabled ? copy.removeBody(person.fullName) : copy.allowBody(person.fullName)}
        confirmLabel={label}
        onConfirm={() => {
          const form = new FormData();
          form.set('userId', person.id);
          form.set('grant', grant);
          form.set('enabled', enabled ? 'false' : 'true');
          submit(form);
        }}
      />
    </>
  );
}

export function SettingsGrants({ staff, viewerId }: { staff: GrantStaffRow[]; viewerId: string }) {
  const others = staff.filter((row) => row.id !== viewerId);

  return (
    <FormSection hint="The audit log is Brightex by default. Assign read access to a named person. Studio stays Brightex only.">
      {others.length === 0 ? (
        <p className="font-ui text-base text-neutral-500">No other active accounts to assign.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {others.map((person) => (
            <li key={person.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-ui font-semibold text-charcoal">{person.fullName}</p>
                <p className="font-ui text-base text-neutral-500">{person.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <GrantButton person={person} grant="can_read_audit" enabled={person.canReadAudit} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}
