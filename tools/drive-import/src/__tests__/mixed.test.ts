import { describe, expect, it } from 'vitest';
import { detectMixedFolders, subjectOf } from '../mixed';

/**
 * Built from the REAL DELFONE 12MM folder, because that is the case that got
 * through: it imported cleanly, produced one product with nineteen
 * photographs of seven different stones, and nothing anywhere reported a
 * problem.
 *
 * The boundary cases matter more than the happy path here. A false positive
 * sends Beco to reorganise a folder that is already correct, which is worse
 * than useless because it teaches them to ignore the report.
 */
const DELFONE = [
  'BOSNIA GREY APP.jpg',
  'BOSNIA GREY SLAB.jpg',
  'BULGARIA BLACK APP.jpg',
  'BULGARIA BLACK SLAB.JPG',
  'CALACATTA MACCHIA APP 1.jpg',
  'CALACATTA MACCHIA SLAB 1.jpg',
  'CALACATTA MACCHIA SLAB 2.jpg',
  'MARTHA BROWN APP 1.png',
  'MARTHA BROWN SLAB.jpg',
  'TAJ MAHAL APP 1.png',
  'VERDE LEPANTO SLAB.jpg',
];

/** A correctly named folder, from AMBER JADE. */
const CORRECT = ['SLAB.jpg', 'SLAB ON STAND.jpg', 'BOOK MATCH.jpg', 'APP 1.jpg', 'APP 2.jpg'];

describe('subjectOf', () => {
  it('finds nothing in a correctly named file, because it is all role', () => {
    for (const filename of CORRECT) {
      expect(subjectOf(filename, 'AMBER JADE')).toBe('');
    }
  });

  it('finds the material a file is named after', () => {
    expect(subjectOf('BOSNIA GREY SLAB.jpg', 'DELFONE 12MM')).toBe('BOSNIA GREY');
    expect(subjectOf('CALACATTA MACCHIA SLAB 2.jpg', 'DELFONE 12MM')).toBe('CALACATTA MACCHIA');
  });

  it('ignores the folder repeating its own name in the file', () => {
    // "AMBER JADE/AMBER JADE SLAB.jpg" is a correct file, not a subject.
    expect(subjectOf('AMBER JADE SLAB.jpg', 'AMBER JADE')).toBe('');
  });

  it('ignores the numbering on a sequence', () => {
    expect(subjectOf('APP 1.jpg', 'AMBER JADE')).toBe('');
    expect(subjectOf('APP 2.jpg', 'AMBER JADE')).toBe('');
  });
});

describe('detectMixedFolders', () => {
  it('flags the Delfone folder and names what it found', () => {
    const [found] = detectMixedFolders([
      { folderPath: '12MM SINTERED STONES/DELFONE 12MM', folderName: 'DELFONE 12MM', filenames: DELFONE },
    ]);

    expect(found).toBeDefined();
    expect(found!.subjects).toContain('BOSNIA GREY');
    expect(found!.subjects).toContain('VERDE LEPANTO');
    // Named in the message, so the report says what to do rather than only
    // that something is wrong.
    expect(found!.reason).toContain('BOSNIA GREY');
    expect(found!.reason).toContain('own folder');
  });

  it('leaves a correctly named folder alone', () => {
    expect(
      detectMixedFolders([
        { folderPath: '12MM SINTERED STONES/AMBER JADE', folderName: 'AMBER JADE', filenames: CORRECT },
      ]),
    ).toEqual([]);
  });

  it('does not flag a folder with a single odd filename', () => {
    // One supplier reference number is a naming problem, reported elsewhere,
    // not evidence of a second product.
    expect(
      detectMixedFolders([
        {
          folderPath: '12MM SINTERED STONES/SANDSTONE BEIGE',
          folderName: 'SANDSTONE BEIGE',
          filenames: ['SLAB.jpg', '2201632A01171.jpg'],
        },
      ]),
    ).toEqual([]);
  });

  it('treats a finish word as a shot description, not a second product', () => {
    // "TAJ MAHAL POLISHED SLAB" and "TAJ MAHAL SLAB" are one product. Counting
    // POLISHED as a subject would split a correct folder in two.
    expect(
      detectMixedFolders([
        {
          folderPath: '12MM SINTERED STONES/TAJ MAHAL',
          folderName: 'TAJ MAHAL',
          filenames: ['TAJ MAHAL POLISHED SLAB.jpg', 'TAJ MAHAL SLAB.jpg'],
        },
      ]),
    ).toEqual([]);
  });

  it('reports nothing for an empty folder', () => {
    expect(
      detectMixedFolders([{ folderPath: 'A/B', folderName: 'B', filenames: [] }]),
    ).toEqual([]);
  });

  it('handles several folders at once and reports only the mixed ones', () => {
    const found = detectMixedFolders([
      { folderPath: 'C/AMBER JADE', folderName: 'AMBER JADE', filenames: CORRECT },
      { folderPath: 'C/DELFONE 12MM', folderName: 'DELFONE 12MM', filenames: DELFONE },
    ]);

    expect(found).toHaveLength(1);
    expect(found[0]!.path).toBe('C/DELFONE 12MM');
  });
});
