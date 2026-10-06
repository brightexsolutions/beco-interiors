import type { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * What the importer itself recorded: `import_runs` and `import_issues`,
 * written by the pipeline with the service role and readable by whoever
 * manages the catalogue (migration 8). This is the report a product manager
 * reads instead of a terminal: what came in, what was skipped, and why.
 */

export interface ImportRunRow {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  mode: string;
  /** The plan counts plus what the run did with them. Any key may be absent
   *  on an older run, so every read defaults to 0. */
  summary: {
    new: number;
    changed: number;
    moved: number;
    unchanged: number;
    missing: number;
    downloaded: number;
    uploaded: number;
    issues: number;
    warnings: number;
  };
}

export interface ImportIssueRow {
  id: string;
  path: string;
  reason: string;
}

/** Issues grouped by the Drive folder they sit in, worst folder first. */
export interface ImportIssueGroup {
  folder: string;
  issues: ImportIssueRow[];
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const toImportRun = (raw: {
  id: string;
  started_at: string;
  finished_at: string | null;
  mode: string;
  summary: unknown;
}): ImportRunRow => {
  const s = (raw.summary && typeof raw.summary === 'object' ? raw.summary : {}) as Record<string, unknown>;
  return {
    id: raw.id,
    startedAt: raw.started_at,
    finishedAt: raw.finished_at,
    mode: raw.mode,
    summary: {
      new: num(s.new),
      changed: num(s.changed),
      moved: num(s.moved),
      unchanged: num(s.unchanged),
      missing: num(s.missing),
      downloaded: num(s.downloaded),
      uploaded: num(s.uploaded),
      issues: num(s.issues),
      warnings: num(s.warnings),
    },
  };
};

export async function fetchImportRuns(supabase: SupabaseClient, limit = 10): Promise<ImportRunRow[]> {
  const { data, error } = await supabase
    .from('import_runs')
    .select('id, started_at, finished_at, mode, summary')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load import runs: ${error.message}`);
  return (data ?? []).map((row) => toImportRun(row as Parameters<typeof toImportRun>[0]));
}

export async function fetchImportIssues(supabase: SupabaseClient, runId: string): Promise<ImportIssueRow[]> {
  const { data, error } = await supabase
    .from('import_issues')
    .select('id, path, reason')
    .eq('run_id', runId)
    .order('path');
  if (error) throw new Error(`Could not load the import report: ${error.message}`);
  return (data ?? []) as ImportIssueRow[];
}

/**
 * One group per top level Drive folder, so the report reads as "Handles has
 * three things to fix" rather than forty lines in path order. A path with
 * no folder ("(root)") groups under itself.
 */
export const groupImportIssues = (issues: readonly ImportIssueRow[]): ImportIssueGroup[] => {
  const groups = new Map<string, ImportIssueRow[]>();
  for (const issue of issues) {
    const folder = issue.path.split('/')[0] || '(root)';
    groups.set(folder, [...(groups.get(folder) ?? []), issue]);
  }
  return [...groups]
    .map(([folder, list]) => ({ folder, issues: list }))
    .sort((a, b) => b.issues.length - a.issues.length || a.folder.localeCompare(b.folder));
};
