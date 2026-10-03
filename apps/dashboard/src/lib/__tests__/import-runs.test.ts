import { describe, expect, it } from 'vitest';
import { groupImportIssues, toImportRun } from '../import-runs';

describe('toImportRun', () => {
  it('defaults every count to 0 for an older run whose summary lacks it', () => {
    const run = toImportRun({ id: 'r1', started_at: '2026-10-03T09:00:00Z', finished_at: null, mode: 'full', summary: { new: 3, issues: '2' } });
    expect(run.summary).toEqual({ new: 3, changed: 0, moved: 0, unchanged: 0, missing: 0, downloaded: 0, uploaded: 0, issues: 0, warnings: 0 });
  });

  it('tolerates a summary that is not an object', () => {
    expect(toImportRun({ id: 'r1', started_at: 'x', finished_at: 'y', mode: 'full', summary: null }).summary.new).toBe(0);
  });
});

describe('groupImportIssues', () => {
  it('groups by the top Drive folder, biggest group first, root paths under (root)', () => {
    const groups = groupImportIssues([
      { id: '1', path: 'HANDLES/BLACK HANDLES', reason: 'a' },
      { id: '2', path: '12MM SINTERED STONES/AMBER JADE/CYPRUS LIGHT GREY', reason: 'b' },
      { id: '3', path: 'HANDLES/HANDLE SIZES AND PRICES', reason: 'c' },
      { id: '4', path: '(root)', reason: 'd' },
    ]);
    expect(groups.map((g) => [g.folder, g.issues.length])).toEqual([
      ['HANDLES', 2],
      ['(root)', 1],
      ['12MM SINTERED STONES', 1],
    ]);
  });

  it('returns nothing for a clean run', () => {
    expect(groupImportIssues([])).toEqual([]);
  });
});
