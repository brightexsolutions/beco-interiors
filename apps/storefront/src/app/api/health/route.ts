import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * One request that proves the site and its database are both up.
 *
 * Uptime monitors and the cron-job.org keep alive point here. The read goes
 * through the anon key against the public settings allowlist, the same path
 * a visitor's page load takes, so a 200 here means a visitor would get a
 * page and the Supabase project counts the activity that stops it pausing.
 * Nothing in the response names a host, a version or a key.
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
