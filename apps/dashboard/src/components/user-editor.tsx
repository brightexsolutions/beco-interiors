'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  Field,
  FormSection,
  Icon,
  Input,
  Select,
  StatusPill,
  useActionToast,
  useKeepValuesSubmit,
} from '@beco/ui';
import {
  removeStaffPhoto,
  resetStaffPassword,
  saveStaffPublicProfile,
  setStaffActive,
  setStaffRole,
  uploadStaffPhoto,
  type UserActionState,
} from '@/app/(app)/users/actions';
import { usePhotoUpload } from '@/components/use-photo-upload';
import { IssuedSecret } from '@/components/user-create';
import {
  STAFF_ROLE_LABEL,
  STAFF_ROLES,
  formatLastLogin,
  staffPhotoUrl,
  type StaffUser,
} from '@/lib/users';
import type { UserRole } from '@beco/types';

const INITIAL: UserActionState = {};

export function UserEditor({ user, viewerId }: { user: StaffUser; viewerId: string }) {
  const router = useRouter();
  const isSelf = user.id === viewerId;
  const [roleState, changeRole, rolePending] = useActionState(setStaffRole, INITIAL);
  const [activeState, changeActive, activePending] = useActionState(setStaffActive, INITIAL);
  const [resetState, resetPassword, resetPending] = useActionState(resetStaffPassword, INITIAL);
  const [publicState, savePublic, publicPending] = useActionState(saveStaffPublicProfile, INITIAL);
  const onSavePublicSubmit = useKeepValuesSubmit(savePublic);
  const [photoState, uploadPhoto, photoPending] = useActionState(uploadStaffPhoto, INITIAL);
  const upload = usePhotoUpload({ area: 'users', field: 'photo', dispatch: uploadPhoto });
  const [removeState, removePhoto, removePending] = useActionState(removeStaffPhoto, INITIAL);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [confirmActive, setConfirmActive] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  useActionToast(roleState);
  useActionToast(activeState);
  useActionToast(resetState);
  useActionToast(publicState);
  useActionToast(photoState);
  useEffect(() => {
    if (photoState.ok || photoState.error) upload.settle();
  }, [photoState, upload.settle]);
  useActionToast(removeState);

  useEffect(() => {
    if (roleState.ok || activeState.ok || publicState.ok || photoState.ok || removeState.ok) {
      router.refresh();
    }
  }, [roleState.ok, activeState.ok, publicState.ok, photoState.ok, removeState.ok, router]);

  const busy =
    rolePending || activePending || resetPending || publicPending || photoPending || removePending || upload.phase !== 'idle';
  const defaultAlt = `${user.fullName} at Beco Interiors`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
        {resetState.password ? <IssuedSecret password={resetState.password} /> : null}

        <FormSection title="Account">
          <dl className="grid gap-3 font-ui text-base">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Name</dt>
              <dd className="text-right text-charcoal">{user.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Email</dt>
              <dd className="min-w-0 text-right break-all text-charcoal">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Last login</dt>
              <dd className="tabular-nums text-charcoal">{formatLastLogin(user.lastLoginAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">Status</dt>
              <dd className="flex flex-wrap justify-end gap-2">
                <StatusPill label={user.isActive ? 'Active' : 'Inactive'} tone={user.isActive ? 'positive' : 'muted'} />
                {user.mustChangePassword ? <StatusPill label="Must change password" tone="attention" /> : null}
              </dd>
            </div>
          </dl>
        </FormSection>

        <FormSection
          title="Role"
          hint={isSelf ? 'Another Brightex admin changes this. You cannot change your own role.' : undefined}
        >
          {isSelf ? (
            <p className="font-ui text-base text-charcoal">{STAFF_ROLE_LABEL[user.role]}</p>
          ) : (
            <Field label="Role" htmlFor="staff-role">
              <Select
                id="staff-role"
                value={user.role}
                disabled={busy}
                onChange={(event) => setPendingRole(event.target.value as UserRole)}
                aria-label={`Change role for ${user.fullName}`}
              >
                {STAFF_ROLES.map((value) => (
                  <option key={value} value={value}>
                    {STAFF_ROLE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </FormSection>

        <FormSection
          title="On the website"
          hint={
            user.role === 'beco_sales'
              ? 'Portrait, title and phone for /team. Directors cannot be listed.'
              : 'Only sales accounts can appear on /team. The photograph can still be stored.'
          }
        >
          <form onSubmit={onSavePublicSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="updatedAt" value={user.updatedAt} />
            {user.role === 'beco_sales' ? (
              <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
                <input
                  type="checkbox"
                  name="isPublic"
                  defaultChecked={user.isPublic}
                  className="h-5 w-5 rounded-control border-neutral-300"
                />
                Show on /team
              </label>
            ) : (
              <p className="font-ui text-base text-neutral-500">This role stays off /team.</p>
            )}
            <Field label="Public title" htmlFor="staff-public-title" hint="Shown under the name">
              <Input
                id="staff-public-title"
                name="publicTitle"
                defaultValue={user.publicTitle ?? ''}
                disabled={busy}
              />
            </Field>
            <Field label="Public phone" htmlFor="staff-public-phone" hint="Kenyan mobile. Used for Call on /team">
              <Input
                id="staff-public-phone"
                name="publicPhone"
                type="tel"
                defaultValue={user.publicPhone ?? ''}
                disabled={busy}
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={busy} pending={publicPending}>
              {publicPending ? 'Saving' : 'Save website listing'}
            </Button>
          </form>

          {user.publicPhoto ? (
            <div className="space-y-3 border border-neutral-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staffPhotoUrl(user.publicPhoto.path, 400)}
                alt={user.publicPhoto.alt || user.fullName}
                width={120}
                height={150}
                className="h-[150px] w-[120px] object-cover"
              />
              <p className="font-ui text-base text-charcoal">{user.publicPhoto.alt}</p>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmRemovePhoto(true)}>
                <Icon name="trash" />
                Remove photograph
              </Button>
            </div>
          ) : (
            <p className="font-ui text-base text-neutral-500">No photograph yet. /team shows a name plate until you add one.</p>
          )}

          <form onSubmit={upload.onSubmit} className="min-w-0 space-y-3 border border-dashed border-neutral-300 p-4">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="updatedAt" value={user.updatedAt} />
            <div className="flex items-center gap-2 text-charcoal">
              <Icon name="photo" className="h-5 w-5" />
              <p className="font-ui text-sm font-semibold text-charcoal">
                {user.publicPhoto ? 'Replace photograph' : 'Add a photograph'}
              </p>
            </div>
            <Field label="Photograph" htmlFor="staff-photo" hint="JPEG, PNG or WebP. 12MB max">
              <Input
                id="staff-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={busy}
                className="min-w-0 max-w-full"
              />
            </Field>
            <Field label="Alt text" htmlFor="staff-photo-alt" hint="Spoken on /team">
              <Input
                id="staff-photo-alt"
                name="alt"
                required
                disabled={busy}
                defaultValue={user.publicPhoto?.alt || defaultAlt}
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={busy} pending={photoPending || upload.phase !== 'idle'}>
              <Icon name="upload" />
              {upload.label ?? (user.publicPhoto ? 'Replace photograph' : 'Upload photograph')}
            </Button>
          </form>
        </FormSection>
      </div>

      {isSelf ? null : (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-neutral-200 px-5 py-3">
          {user.isActive ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmActive(true)}>
              Deactivate
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmActive(true)}>
              Reactivate
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
            Reset password
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendingRole != null && pendingRole !== user.role}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null);
        }}
        title={`Change ${user.fullName}'s role?`}
        description={`${user.fullName} is ${STAFF_ROLE_LABEL[user.role]}. This becomes ${pendingRole ? STAFF_ROLE_LABEL[pendingRole] : ''}. They keep their quotes.`}
        confirmLabel="Change role"
        onConfirm={() => {
          const form = new FormData();
          form.set('userId', user.id);
          form.set('updatedAt', user.updatedAt);
          form.set('role', pendingRole ?? user.role);
          setPendingRole(null);
          changeRole(form);
        }}
      />

      <ConfirmDialog
        open={confirmActive}
        onOpenChange={setConfirmActive}
        title={user.isActive ? `Deactivate ${user.fullName}?` : `Reactivate ${user.fullName}?`}
        description={
          user.isActive
            ? `${user.fullName}'s sessions will end and they cannot sign in. Quotes they raised stay attributed to them. Nothing is deleted.`
            : `${user.fullName} will be able to sign in again.`
        }
        confirmLabel={user.isActive ? 'Deactivate' : 'Reactivate'}
        destructive={user.isActive}
        onConfirm={() => {
          const form = new FormData();
          form.set('userId', user.id);
          form.set('updatedAt', user.updatedAt);
          if (!user.isActive) form.set('isActive', 'true');
          setConfirmActive(false);
          changeActive(form);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`Reset ${user.fullName}'s password?`}
        description={`A new password is shown once. ${user.fullName} must change it on next sign in. Their current sessions end.`}
        confirmLabel="Reset password"
        onConfirm={() => {
          const form = new FormData();
          form.set('userId', user.id);
          form.set('updatedAt', user.updatedAt);
          setConfirmReset(false);
          resetPassword(form);
        }}
      />

      <ConfirmDialog
        open={confirmRemovePhoto}
        onOpenChange={setConfirmRemovePhoto}
        title={`Remove ${user.fullName}'s photograph?`}
        description={`${user.fullName} will show a name plate on /team until you upload another. The file is deleted from storage.`}
        confirmLabel="Remove photograph"
        destructive
        onConfirm={() => {
          const form = new FormData();
          form.set('userId', user.id);
          form.set('updatedAt', user.updatedAt);
          setConfirmRemovePhoto(false);
          removePhoto(form);
        }}
      />
    </div>
  );
}
