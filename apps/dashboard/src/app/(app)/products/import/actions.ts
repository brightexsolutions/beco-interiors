'use server';

import { revalidatePath } from 'next/cache';
import { createRateLimiter, startImportSchema, IMPORT_MODE_LABEL } from '@beco/validation';
import { dispatchImport } from '@/lib/github-actions';
import { reportOpsFailure } from '@/lib/ops-alert';
import { requirePath } from '@/lib/session';

export interface ImportActionState {
  ok?: string;
  error?: string;
}

// One dispatch a minute per person. A second click while the first run is
// still queueing would start a second import of the same folder; the
// workflow's own concurrency group serialises them, but there is no reason
// to let the queue build from an impatient thumb.
const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

/**
 * Starts a catalogue import by dispatching the GitHub workflow. Re-checks
 * the caller, per rule 7: the page having rendered the button does not gate
 * the POST. Writes nothing itself; `import_runs` and the workflow log are
 * the record of what happened.
 */
export async function startImport(_prev: ImportActionState, form: FormData): Promise<ImportActionState> {
  const user = await requirePath('/products');
  const parsed = startImportSchema.safeParse({
    mode: formString(form, 'mode'),
    target: formString(form, 'target'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the choices and try again.' };
  }

  if (!limiter.check(`import:${user.userId}`).ok) {
    return { error: 'An import was started less than a minute ago. Give it a moment, then check the runs below.' };
  }

  const result = await dispatchImport(parsed.data);
  if (!result.ok) {
    await reportOpsFailure({
      area: 'catalogue.import',
      summary: 'A catalogue import could not be started from the dashboard',
      detail: result.error,
      context: { mode: parsed.data.mode, target: parsed.data.target, by: user.email },
    });
    return { error: result.error };
  }

  revalidatePath('/products/import');
  return {
    ok: `${IMPORT_MODE_LABEL[parsed.data.mode]} started on ${parsed.data.target}. It appears in the runs below within a minute and takes up to twenty minutes on a cold cache.`,
  };
}
