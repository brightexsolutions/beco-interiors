import 'server-only';
import type { StartImportInput } from '@beco/validation';

/**
 * The dashboard's hand on the Catalogue import workflow.
 *
 * The importer itself runs in GitHub Actions (`.github/workflows/drive-import.yml`):
 * Sharp, the Drive service account and the service role key never reach
 * Vercel. This module only dispatches that workflow and reads its runs, with
 * a fine grained token scoped to Actions on this one repository. Everything
 * the GitHub API returns is treated as data to display, never as instruction.
 */

export const IMPORT_WORKFLOW_FILE = 'drive-import.yml';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8_000;

export type ImportConnection =
  | { configured: true; repo: string; ref: string }
  | { configured: false; missing: string[] };

/** What the screen needs to know before it offers a Run button. */
export const importConnection = (env: NodeJS.ProcessEnv = process.env): ImportConnection => {
  const missing: string[] = [];
  if (!env.GITHUB_ACTIONS_TOKEN) missing.push('GITHUB_ACTIONS_TOKEN');
  const repo = env.GITHUB_REPOSITORY ?? '';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) missing.push('GITHUB_REPOSITORY');
  if (missing.length > 0) return { configured: false, missing };
  return { configured: true, repo, ref: env.GITHUB_WORKFLOW_REF || 'main' };
};

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'beco-dashboard',
});

/** The exact body the dispatch endpoint takes. Pure, so it is testable. */
export const dispatchBody = (input: StartImportInput, ref: string) => ({
  ref,
  inputs: { mode: input.mode, target: input.target },
});

export async function dispatchImport(input: StartImportInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const connection = importConnection();
  if (!connection.configured) {
    return { ok: false, error: `The import is not connected: ${connection.missing.join(', ')} not set.` };
  }
  try {
    const response = await fetch(
      `${API}/repos/${connection.repo}/actions/workflows/${IMPORT_WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: { ...headers(process.env.GITHUB_ACTIONS_TOKEN!), 'content-type': 'application/json' },
        body: JSON.stringify(dispatchBody(input, connection.ref)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    // 204 is the only success. Anything else is GitHub's text, kept out of
    // the UI and left to the log and the alert.
    if (response.status === 204) return { ok: true };
    return { ok: false, error: `GitHub refused the import (HTTP ${response.status}).` };
  } catch {
    return { ok: false, error: 'GitHub did not answer. Try again in a minute.' };
  }
}

export interface ImportWorkflowRun {
  id: number;
  number: number;
  /** The run name, "Catalogue import, dry-run to staging". */
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'pending' | 'requested' | 'unknown';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  actor: string | null;
}

const STATUSES = new Set(['queued', 'in_progress', 'completed', 'waiting', 'pending', 'requested']);
const CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required']);

/** One run from GitHub's shape to ours. Null for anything malformed. */
export const toWorkflowRun = (raw: unknown): ImportWorkflowRun | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'number' || typeof r.run_number !== 'number') return null;
  const status = typeof r.status === 'string' && STATUSES.has(r.status) ? (r.status as ImportWorkflowRun['status']) : 'unknown';
  const conclusion =
    typeof r.conclusion === 'string' && CONCLUSIONS.has(r.conclusion)
      ? (r.conclusion as ImportWorkflowRun['conclusion'])
      : null;
  const actor = r.actor && typeof r.actor === 'object' ? (r.actor as { login?: unknown }).login : null;
  return {
    id: r.id,
    number: r.run_number,
    name: typeof r.display_title === 'string' && r.display_title ? r.display_title : typeof r.name === 'string' ? r.name : 'Catalogue import',
    status,
    conclusion,
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
    updatedAt: typeof r.updated_at === 'string' ? r.updated_at : '',
    url: typeof r.html_url === 'string' && r.html_url.startsWith('https://github.com/') ? r.html_url : '',
    actor: typeof actor === 'string' ? actor : null,
  };
};

export async function listImportRuns(limit = 10): Promise<{ runs: ImportWorkflowRun[]; error?: string }> {
  const connection = importConnection();
  if (!connection.configured) return { runs: [] };
  try {
    const response = await fetch(
      `${API}/repos/${connection.repo}/actions/workflows/${IMPORT_WORKFLOW_FILE}/runs?per_page=${limit}`,
      { headers: headers(process.env.GITHUB_ACTIONS_TOKEN!), signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' },
    );
    if (!response.ok) return { runs: [], error: `GitHub did not list the runs (HTTP ${response.status}).` };
    const body = (await response.json()) as { workflow_runs?: unknown[] };
    const runs = (body.workflow_runs ?? []).map(toWorkflowRun).filter((run): run is ImportWorkflowRun => run !== null);
    return { runs };
  } catch {
    return { runs: [], error: 'GitHub did not answer, so recent runs are not shown.' };
  }
}

/** What to call a run and which tone it takes, in words a product manager reads. */
export const describeRun = (run: Pick<ImportWorkflowRun, 'status' | 'conclusion'>): {
  label: string;
  tone: 'neutral' | 'positive' | 'attention' | 'muted';
} => {
  if (run.status !== 'completed') {
    if (run.status === 'waiting' || run.status === 'action_required' as string) return { label: 'Waiting for approval', tone: 'neutral' };
    return { label: run.status === 'in_progress' ? 'Running' : 'Queued', tone: 'neutral' };
  }
  switch (run.conclusion) {
    case 'success':
      return { label: 'Done', tone: 'positive' };
    case 'failure':
    case 'timed_out':
      return { label: 'Failed', tone: 'attention' };
    case 'action_required':
      return { label: 'Waiting for approval', tone: 'neutral' };
    case 'cancelled':
    case 'skipped':
      return { label: 'Cancelled', tone: 'muted' };
    default:
      return { label: 'Finished', tone: 'muted' };
  }
};
