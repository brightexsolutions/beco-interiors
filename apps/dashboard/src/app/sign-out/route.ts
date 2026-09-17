import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * Ends the Supabase session and returns to the login screen.
 *
 * A route handler rather than a server action, which it used to be, because
 * the action could not survive its own redirect. `redirect('/login')` from an
 * action makes the browser replay the POST against the destination, and Next
 * then resolves the action id inside THAT route's module graph. `/login` sits
 * outside the `(app)` group, never imports this, and so has no such action:
 * the reply came back without a result and React raised "An unexpected
 * response was received from the server" over a sign out that had in fact
 * already succeeded. The session was gone and the screen was broken, which is
 * the worst pairing of the two.
 *
 * A plain form POST has no such reconciliation to do. Signing out is a full
 * exit from the app shell, so a browser navigation is the honest behaviour
 * anyway, and it clears the client router cache with it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();

  // 303, so the browser follows with GET. A 307 would repeat the POST at
  // /login, which is how you get a "confirm form resubmission" on a refresh.
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
