import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * One request that proves the site and its database are both up.
 *
 * The dashboard's uptime monitor points here. It sits outside the session
 * proxy, carries no session and reads only the public settings allowlist
 * through the anon key, so it reveals nothing a visitor to the storefront
 * could not already read. Nothing in the response names a host, a version
 * or a key.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const headers = { 'cache-control': 'no-store' };
  if (!url || !key) {
    return NextResponse.json({ ok: false, database: 'unconfigured' }, { status: 503, headers });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('settings').select('key').limit(1);
  if (error) {
    return NextResponse.json({ ok: false, database: 'down' }, { status: 503, headers });
  }
  return NextResponse.json({ ok: true, database: 'up' }, { headers });
}
