'use client';

import { startTransition, useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog, FormSection, Spinner, useActionToast } from '@beco/ui';
import type { DashboardModule } from '@beco/types';
import { setStaffGrant, type SettingsActionState } from '@/app/(app)/settings/actions';
import { ModuleAccessEditor, ModuleAccessSummary } from '@/components/module-access';
import type { GrantStaffRow } from '@/lib/settings';
import { STAFF_ROLE_LABEL } from '@/lib/users';
import type { UserRole } from '@beco/types';

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
  can_manage_users: {
    allow: 'Allow staff',
    remove: 'Remove staff',
    allowTitle: 'Allow staff management',
    removeTitle: 'Remove staff management',
    allowBody: (name: string) =>
      `${name} will be able to add Beco staff, change their roles, deactivate them and reissue passwords. Brightex accounts and these permissions stay with Brightex.`,
    removeBody: (name: string) => `${name} will no longer manage staff accounts.`,
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
        aria-busy={pending || undefined}
        className="inline-flex h-11 items-center gap-2 px-3 font-ui text-base text-charcoal underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? <Spinner /> : null}
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
          // Inside a transition, so `pending` drives the spinner.
          startTransition(() => submit(form));
        }}
      />
    </>
  );
}

/**
 * The Permissions tab, D135 and D136. Two kinds of grant per person: the
 * staff grants (audit read, staff management), Brightex only, each behind a
 * ConfirmDialog; and module access, the sections a person may see beyond
 * their role, through the same editor the user's own sheet opens.
 */
export function SettingsGrants({
  staff,
  viewerId,
  canAssignStaffGrants = true,
  grantable = [],
}: {
  staff: GrantStaffRow[];
  viewerId: string;
  /** False for a Beco admin holding the staff grant: module access only. */
  canAssignStaffGrants?: boolean | undefined;
  /** The modules the viewer may grant, from `grantableModules`. */
  grantable?: readonly DashboardModule[] | undefined;
}) {
  const router = useRouter();
  const others = staff.filter((row) => row.id !== viewerId);
  const refresh = () => router.refresh();

  return (
    <FormSection
      hint={
        canAssignStaffGrants
          ? 'Brightex by default. Audit reads the log. Staff adds and manages Beco accounts. Access lets a person see a section beyond their role, read only. Studio stays Brightex only.'
          : 'Access lets a person see a section beyond their role, read only. You can grant the sections you reach yourself. Audit and staff grants stay with Brightex.'
      }
    >
      {others.length === 0 ? (
        <p className="font-ui text-base text-neutral-500">No other active accounts to assign.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {others.map((person) => {
            const role = person.role as UserRole;
            const brightex = role === 'brightex_admin';
            return (
              <li key={person.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <p className="font-ui font-semibold text-charcoal">{person.fullName}</p>
                  <p className="font-ui text-base text-neutral-500">
                    {person.email} · {STAFF_ROLE_LABEL[role] ?? person.role}
                  </p>
                  <div className="mt-2">
                    <ModuleAccessSummary person={{ role, moduleGrants: person.moduleGrants }} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {brightex ? null : (
                    <ModuleAccessEditor
                      person={{ id: person.id, fullName: person.fullName, role, moduleGrants: person.moduleGrants, updatedAt: person.updatedAt }}
                      grantable={grantable}
                      onSaved={refresh}
                    />
                  )}
                  {canAssignStaffGrants ? (
                    <>
                      <GrantButton person={person} grant="can_read_audit" enabled={person.canReadAudit} />
                      {brightex ? null : (
                        <GrantButton person={person} grant="can_manage_users" enabled={person.canManageUsers} />
                      )}
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FormSection>
  );
}
