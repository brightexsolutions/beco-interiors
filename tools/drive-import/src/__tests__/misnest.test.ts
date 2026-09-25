import { describe, expect, it } from 'vitest';
import { detectMisnests, misnestedPaths } from '../misnest';

/** The real defect: two products filed inside a third. */
const REAL_EXPORT = [
  { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
  { path: 'CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 1 },
  { path: 'GALAXY BIANCO', name: 'GALAXY BIANCO', depth: 1 },
  { path: 'STATUARIO', name: 'STATUARIO', depth: 1 },
  // Misfiled, byte identical to the top level copies.
  { path: 'AMBER JADE/CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 2 },
  { path: 'AMBER JADE/GALAXY BIANCO', name: 'GALAXY BIANCO', depth: 2 },
];

describe('detectMisnests', () => {
  it('finds both products misfiled inside Amber Jade', () => {
    const found = detectMisnests(REAL_EXPORT);
    expect(found).toHaveLength(2);
    expect(found.map((m) => m.name).sort()).toEqual(['CYPRUS LIGHT GREY', 'GALAXY BIANCO']);
  });

  it('says WHY, naming the accidental parent, so the report is actionable', () => {
    const [first] = detectMisnests(REAL_EXPORT);
    expect(first!.reason).toContain('AMBER JADE');
    expect(first!.reason).toContain('already exists at the top level');
  });

  it('excludes the nested copies so a gallery cannot get another stone’s photos', () => {
    const excluded = misnestedPaths(detectMisnests(REAL_EXPORT));
    expect(excluded.has('AMBER JADE/CYPRUS LIGHT GREY')).toBe(true);
    // The legitimate top level folder is untouched.
    expect(excluded.has('CYPRUS LIGHT GREY')).toBe(false);
  });

  it('flags a nested folder even when it does NOT match a top level sibling', () => {
    const found = detectMisnests([
      { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
      { path: 'AMBER JADE/EXTRA SHOTS', name: 'EXTRA SHOTS', depth: 2 },
    ]);
    // Still skipped rather than guessed at: it might be a real product or a
    // stray folder, and the pipeline never invents an answer.
    expect(found).toHaveLength(1);
    expect(found[0]!.matchesTopLevel).toBe(false);
    expect(found[0]!.reason).toContain('must sit directly under their category');
  });

  it('reports nothing for a clean category', () => {
    expect(detectMisnests([
      { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
      { path: 'STATUARIO', name: 'STATUARIO', depth: 1 },
    ])).toHaveLength(0);
  });
});
