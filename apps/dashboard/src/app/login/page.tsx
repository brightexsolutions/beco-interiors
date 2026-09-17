import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { PageHeading } from '@/components/page-heading';
import { isDevQuickLoginEnabled } from '@/lib/dev-quick-login';
import { getSupabase } from '@/lib/supabase';
import { SignInForm } from './sign-in-form';
import { DevQuickLogin } from './dev-quick-login';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const next = one(params.next).startsWith('/') ? one(params.next) : '/';
  const denied = one(params.denied) === '1';

  // A convenience, not a gate: if there is already a session, send it on. The
  // destination does its own check and bounces back here with ?denied=1 if
  // the account is not allowed, which renders rather than redirects, so there
  // is no loop.
  if (!denied) {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(next);
  }

  return (
    <AuthShell>
      <PageHeading title="Sign in" />
      <SignInForm next={next} denied={denied} />
      {isDevQuickLoginEnabled() ? <DevQuickLogin next={next} /> : null}
    </AuthShell>
  );
}
