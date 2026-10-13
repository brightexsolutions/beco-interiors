'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  Icon,
  StatusPill,
  useActionToast,
} from '@beco/ui';
import { DASHBOARD_MODULES, type DashboardModule, type UserRole } from '@beco/types';
import { setModuleGrants, type UserActionState } from '@/app/(app)/users/actions';
import { MODULE_HINT, MODULE_LABEL, isDashboardModule, roleCoversModule } from '@/lib/access';
import { STAFF_ROLE_LABEL } from '@/lib/users';

const INITIAL: UserActionState = {};

export interface ModuleAccessPerson {
  id: string;
  fullName: string;
  role: UserRole;
  moduleGrants: readonly string[];
  updatedAt: string;
}

/** What the person can see, as pills: the role's own sections quiet, the granted ones marked. */
export function ModuleAccessSummary({
  person,
}: {
  person: Pick<ModuleAccessPerson, 'role' | 'moduleGrants'>;
}) {
  const granted = person.moduleGrants.filter(isDashboardModule);
  if (granted.length === 0) {
    return <p className="font-ui text-sm text-neutral-500">Role access only</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Extra access">
      {granted.map((module) => (
        <li key={module}>
          <StatusPill label={MODULE_LABEL[module]} tone="neutral" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The one place a person's module access is changed, D136. A button opens a
 * Dialog listing every section: the ones the role already carries are
 * ticked and locked with that reason, the ones the viewer cannot hand on
 * are locked with theirs, the rest are the viewer's to tick. Save writes the
 * whole set under the account's lock. Used on the user's own sheet and on
 * the Permissions tab, so the two cannot drift.
 */
export function ModuleAccessEditor({
  person,
  grantable,
  onSaved,
  disabled = false,
}: {
  person: ModuleAccessPerson;
  /** The modules the viewer may grant, from `grantableModules`. */
  grantable: readonly DashboardModule[];
  onSaved?: (() => void) | undefined;
  disabled?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(setModuleGrants, INITIAL);
  const [picked, setPicked] = useState<Set<DashboardModule>>(
    () => new Set(person.moduleGrants.filter(isDashboardModule)),
  );
  const saveRef = useRef<HTMLButtonElement>(null);
  useActionToast(state);

  useEffect(() => {
    setPicked(new Set(person.moduleGrants.filter(isDashboardModule)));
  }, [person.id, person.updatedAt, person.moduleGrants]);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      onSaved?.();
    }
  }, [state, onSaved]);

  const toggle = (module: DashboardModule) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const save = () => {
    const form = new FormData();
    form.set('userId', person.id);
    form.set('updatedAt', person.updatedAt);
    for (const module of DASHBOARD_MODULES) {
      if (picked.has(module)) form.append('modules', module);
    }
    startTransition(() => submit(form));
  };

  const canGrantAnything = grantable.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !canGrantAnything}
        onClick={() => setOpen(true)}
      >
        <Icon name="pencil" />
        Edit access
      </Button>
      {canGrantAnything ? null : (
        <p className="mt-2 font-ui text-sm text-neutral-500">
          Only Brightex, or a staff manager, changes access.
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen} title={`Access for ${person.fullName}`}>
        <DialogBody>
          <p className="font-ui text-base text-neutral-500">
            {STAFF_ROLE_LABEL[person.role]} by role. Tick a section to let{' '}
            {person.fullName.split(/\s+/)[0]} see it as well. Granted sections open read only:
            changing records stays with the role.
          </p>
          <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {DASHBOARD_MODULES.map((module) => {
              const byRole = roleCoversModule(person.role, module);
              const reachable = grantable.includes(module);
              const locked = byRole || !reachable;
              const reason = byRole
                ? `Included in the ${STAFF_ROLE_LABEL[person.role]} role`
                : !reachable
                  ? 'Only someone who holds this can grant it'
                  : null;
              const id = `module-${person.id}-${module}`;
              return (
                <li key={module} className="flex min-h-14 items-start gap-3 py-3">
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 rounded-control border-neutral-300 accent-charcoal"
                    checked={byRole || picked.has(module)}
                    disabled={locked || pending}
                    aria-describedby={`${id}-hint`}
                    onChange={() => toggle(module)}
                  />
                  <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block font-ui text-base font-semibold text-charcoal">
                      {MODULE_LABEL[module]}
                    </span>
                    <span id={`${id}-hint`} className="block font-ui text-sm text-neutral-500">
                      {reason ?? MODULE_HINT[module]}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            ref={saveRef}
            type="button"
            variant="primary"
            pending={pending}
            disabled={pending}
            onClick={save}
          >
            {pending ? 'Saving' : 'Save access'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
