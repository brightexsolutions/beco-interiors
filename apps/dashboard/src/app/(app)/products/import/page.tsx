import type { Metadata } from 'next';
import { BackLink } from '@beco/ui';
import { DriveShapeGuide } from '@/components/drive-shape-guide';
import { ImportReport } from '@/components/import-report';
import { ImportRunner } from '@/components/import-runner';
import { ImportWorkflowRuns } from '@/components/import-workflow-runs';
import { PageHeading } from '@/components/page-heading';
import { importConnection, listImportRuns } from '@/lib/github-actions';
import { fetchImportIssues, fetchImportRuns } from '@/lib/import-runs';
import { isAdminRole } from '@/lib/access';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Drive import',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The Drive import, run and read from the dashboard (D105). The run button
 * dispatches the GitHub workflow; the list below it is what GitHub knows;
 * the report is what the importer itself recorded in `import_runs` and
 * `import_issues` the last time it touched this database.
 */
export default async function ImportPage() {
  const user = await requirePath('/products/import');
  const supabase = await getSupabase();
  const connection = importConnection();

  const [workflow, runs] = await Promise.all([
    connection.configured ? listImportRuns(10) : Promise.resolve({ runs: [] }),
    fetchImportRuns(supabase, 1),
  ]);
  const last = runs[0] ?? null;
  const issues = last ? await fetchImportIssues(supabase, last.id) : [];

  return (
    <>
      <BackLink href="/products" className="mb-2">
        Catalogue
      </BackLink>
      <PageHeading
        eyebrow="Catalogue"
        title="Drive import"
        lede="Bring new photographs and ranges in from BECO PRODUCTS, and see what the last run skipped and why."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <ImportRunner
            configured={connection.configured}
            missing={connection.configured ? [] : connection.missing}
            // Production is an admin's target (D110). The product manager
            // proves a folder on staging first; an admin runs it live.
            canTargetProduction={isAdminRole(user.role)}
          />
          <ImportReport run={last} issues={issues} />
        </div>
        <div className="space-y-6">
          <ImportWorkflowRuns runs={workflow.runs} error={'error' in workflow ? workflow.error : undefined} configured={connection.configured} />
          <DriveShapeGuide />
        </div>
      </div>
    </>
  );
}
