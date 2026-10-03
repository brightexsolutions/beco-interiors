import { Notice, Panel, StatusPill } from '@beco/ui';
import { describeRun, type ImportWorkflowRun } from '@/lib/github-actions';

const when = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

/**
 * The runs GitHub knows about, newest first: what was asked for, by whom,
 * when, and how it ended, each with a link to its full log. The run name
 * carries the mode and the target ("dry-run to staging"), set by the
 * workflow itself so it cannot drift from what actually ran.
 */
export function ImportWorkflowRuns({ runs, error, configured }: { runs: ImportWorkflowRun[]; error?: string | undefined; configured: boolean }) {
  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">Recent runs</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">Every run of the import, from GitHub.</p>
        </div>
      }
    >
      {error ? (
        <div className="px-4 py-4 sm:px-5">
          <Notice tone="alert">{error}</Notice>
        </div>
      ) : null}
      {!configured ? (
        <p className="px-4 py-6 font-ui text-base text-neutral-500 sm:px-5">
          Connect GitHub to see runs here.
        </p>
      ) : runs.length === 0 && !error ? (
        <p className="px-4 py-6 font-ui text-base text-neutral-500 sm:px-5">No runs yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {runs.map((run) => {
            const { label, tone } = describeRun(run);
            return (
              <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-base text-charcoal">{run.name}</p>
                  <p className="font-ui text-sm text-neutral-500">
                    #{run.number}
                    {run.actor ? ` · started by ${run.actor}` : ''}
                    {run.createdAt ? ` · ${when(run.createdAt)}` : ''}
                  </p>
                </div>
                <StatusPill label={label} tone={tone} />
                {run.url ? (
                  <a
                    href={run.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-ui text-sm font-semibold text-charcoal underline-offset-4 hover:underline"
                  >
                    Open log
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
