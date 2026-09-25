import { describe, expect, it } from 'vitest';
import { projectTypeFacets } from '../products';

describe('projectTypeFacets', () => {
  it('counts real classified shots by type, with a real label', () => {
    const facets = projectTypeFacets([
      { projectType: 'residential' }, { projectType: 'commercial' }, { projectType: 'residential' },
    ]);
    expect(facets).toEqual([
      { value: 'residential', label: 'Residential', count: 2 },
      { value: 'commercial', label: 'Commercial', count: 1 },
    ]);
  });

  it('ignores an unclassified shot rather than counting it as either', () => {
    const facets = projectTypeFacets([{ projectType: 'residential' }, {}, { projectType: undefined }]);
    expect(facets).toEqual([{ value: 'residential', label: 'Residential', count: 1 }]);
  });

  it('returns nothing at all when no shot has been classified yet', () => {
    // The real state at launch: every photograph is real, none carry a
    // project type. The gallery's own filter reads this as "hide the
    // control entirely" rather than "show it filtering to nothing."
    expect(projectTypeFacets([{}, {}, {}])).toEqual([]);
  });

  it('returns nothing for an empty list', () => {
    expect(projectTypeFacets([])).toEqual([]);
  });
});
