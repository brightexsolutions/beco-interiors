import { Panel, StatusPill } from '@beco/ui';
import { groupImportIssues, type ImportIssueRow, type ImportRunRow } from '@/lib/import-runs';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : 'still running';

/**
 * What the last import found, as the pipeline recorded it: the counts, then
 * every skipped item grouped by the Drive folder it sits in with the reason
 * written for the person who can fix it. This is the terminal report, on a
 * screen, for someone who will never open a terminal.
 */
export function ImportReport({ run, issues }: { run: ImportRunRow | null; issues: ImportIssueRow[] }) {
  if (!run) {
    return (
      <Panel title={<h2 className="font-ui text-base font-semibold text-charcoal">Last import</h2>}>
        <p className="px-4 py-6 font-ui text-base text-neutral-500 sm:px-5">
          No import has run against this database yet.
        </p>
      </Panel>
    );
  }
  const s = run.summary;
  const groups = groupImportIssues(issues);
  const figures: Array<[string, number]> = [
    ['New', s.new],
    ['Changed', s.changed],
    ['Moved', s.moved],
    ['Unchanged', s.unchanged],
    ['Missing', s.missing],
    ['Downloaded', s.downloaded],
    ['Uploaded', s.uploaded],
  ];

  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">Last import</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">
            Started {when(run.startedAt)}, finished {when(run.finishedAt)}.
          </p>
        </div>
      }
      action={
        issues.length > 0 ? (
          <StatusPill label={`${issues.length} to look at`} tone="attention" />
        ) : (
          <StatusPill label="Nothing skipped" tone="positive" />
        )
      }
    >
      <dl className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 sm:grid-cols-4 xl:grid-cols-7">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-high-vis-white px-4 py-3">
            <dt className="font-ui text-sm text-neutral-500">{label}</dt>
            <dd className="font-display text-2xl leading-none tabular-nums text-charcoal">{value}</dd>
          </div>
        ))}
      </dl>

      {groups.length > 0 ? (
        <div className="divide-y divide-neutral-200">
          {groups.map((group) => (
            <details key={group.folder} className="group px-4 py-3 sm:px-5" open={groups.length <= 3}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-ui text-base font-semibold text-charcoal marker:content-none">
                <span className="truncate">{group.folder}</span>
                <span className="shrink-0 font-normal tabular-nums text-neutral-500">
                  {group.issues.length} {group.issues.length === 1 ? 'item' : 'items'}
                </span>
              </summary>
              <ul className="mt-2 space-y-3">
                {group.issues.map((issue) => (
                  <li key={issue.id} className="border-l-2 border-neutral-300 pl-3">
                    <p className="break-words font-mono text-sm text-charcoal">{issue.path}</p>
                    <p className="mt-0.5 max-w-[68ch] font-ui text-sm text-neutral-700">{issue.reason}</p>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
