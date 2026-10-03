import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ImportReport } from '../import-report';
import { ImportWorkflowRuns } from '../import-workflow-runs';
import { DriveShapeGuide } from '../drive-shape-guide';
import type { ImportRunRow } from '@/lib/import-runs';

const run: ImportRunRow = {
  id: 'r1',
  startedAt: '2026-10-03T09:00:00Z',
  finishedAt: '2026-10-03T09:12:00Z',
  mode: 'full',
  summary: { new: 12, changed: 2, moved: 1, unchanged: 140, missing: 0, downloaded: 14, uploaded: 42, issues: 3, warnings: 0 },
};

describe('ImportReport', () => {
  it('says plainly when nothing has run against this database', () => {
    render(<ImportReport run={null} issues={[]} />);
    expect(screen.getByText(/No import has run/)).toBeInTheDocument();
  });

  it('shows the counts and groups skipped items by their Drive folder with the reason', () => {
    render(
      <ImportReport
        run={run}
        issues={[
          { id: '1', path: 'HANDLES/BLACK HANDLES', reason: 'Every photograph names its own item.' },
          { id: '2', path: 'HANDLES/HANDLE SIZES AND PRICES', reason: '2 document(s) are reference material.' },
          { id: '3', path: '15MM SINTERED STONES', reason: 'Imported as ONE product.' },
        ]}
      />,
    );
    expect(screen.getByText('New').nextElementSibling).toHaveTextContent('12');
    expect(screen.getByText('3 to look at')).toBeInTheDocument();
    const handles = screen.getByText('HANDLES').closest('details')!;
    expect(handles).toHaveTextContent('2 items');
    expect(handles).toHaveTextContent('Every photograph names its own item.');
    // The folder name is both the group heading and the issue's own path.
    const [heading] = screen.getAllByText('15MM SINTERED STONES');
    expect(heading!.closest('details')).toHaveTextContent('1 item');
  });

  it('marks a clean run as nothing skipped', () => {
    render(<ImportReport run={run} issues={[]} />);
    expect(screen.getByText('Nothing skipped')).toBeInTheDocument();
  });

  it('is axe clean with and without issues', async () => {
    const { container, rerender } = render(<ImportReport run={run} issues={[{ id: '1', path: 'X', reason: 'y' }]} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<ImportReport run={null} issues={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ImportWorkflowRuns', () => {
  const runs = [
    { id: 2, number: 9, name: 'Catalogue import, import to production', status: 'in_progress' as const, conclusion: null, createdAt: '2026-10-03T09:00:00Z', updatedAt: '', url: 'https://github.com/brightexsolutions/beco-interiors/actions/runs/2', actor: 'irene' },
    { id: 1, number: 8, name: 'Catalogue import, dry-run to staging', status: 'completed' as const, conclusion: 'failure' as const, createdAt: '2026-10-02T09:00:00Z', updatedAt: '', url: '', actor: null },
  ];

  it('lists each run with its outcome in words and a log link where GitHub gave one', () => {
    render(<ImportWorkflowRuns runs={runs} configured />);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open log' })).toHaveLength(1);
    expect(screen.getByText(/started by irene/)).toBeInTheDocument();
  });

  it('says when GitHub is not connected, and when it did not answer', () => {
    const { rerender } = render(<ImportWorkflowRuns runs={[]} configured={false} />);
    expect(screen.getByText(/Connect GitHub/)).toBeInTheDocument();
    rerender(<ImportWorkflowRuns runs={[]} configured error="GitHub did not answer, so recent runs are not shown." />);
    expect(screen.getByText(/did not answer/)).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<ImportWorkflowRuns runs={runs} configured />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('DriveShapeGuide', () => {
  it('names the four folder shapes and the price list rule', async () => {
    const { container } = render(<DriveShapeGuide />);
    expect(screen.getByText(/one photograph per item/)).toBeInTheDocument();
    expect(screen.getByText(/Price lists and spreadsheets/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
