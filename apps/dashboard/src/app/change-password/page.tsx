import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { requireSignedIn } from '@/lib/session';
import { ChangePasswordForm } from './change-password-form';

export const metadata: Metadata = {
  title: 'Change your password',
  robots: { index: false, follow: false },
};

/**
 * The forced first-login change (ARCHITECTURE section 11), and the same
 * screen for a voluntary change later. The proxy sends a flagged user here
 * and nowhere else until it is done; a user who is not flagged can still
 * reach it to change their password on purpose.
 */
export default async function ChangePasswordPage() {
  const user = await requireSignedIn();
  const forced = user.mustChangePassword;

  return (
    <AuthShell eyebrow={forced ? 'First sign-in' : 'Account'}>
      <h1 className="font-ui text-2xl font-semibold text-charcoal">
        {forced ? 'Set your password' : 'Change your password'}
      </h1>
      <p className="mb-8 mt-2 font-ui text-base text-neutral-500">
        {forced
          ? 'Your account opened with a temporary password. Choose your own to carry on.'
          : 'Pick a new password for your Beco account.'}
      </p>
      <ChangePasswordForm email={user.email} />
    </AuthShell>
  );
}
