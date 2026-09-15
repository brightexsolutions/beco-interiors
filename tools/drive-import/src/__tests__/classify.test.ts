import { describe, expect, it } from 'vitest';
import { classify, summarise, type DriveFile, type KnownFile } from '../classify';

const drive = (id: string, path: string, md5: string): DriveFile => ({
  id, path, md5, size: 1024, modifiedTime: '2026-08-29T07:51:36Z',
});
const known = (id: string, path: string, md5: string): KnownFile => ({
  driveFileId: id, path, md5, role: 'slab', productId: 'p1',
});

describe('classify', () => {
  it('a file never seen before is new', () => {
    const r = classify([drive('1', 'AMBER JADE/SLAB.jpg', 'aaa')], []);
    expect(r[0]!.outcome).toBe('new');
  });

  it('same id and same md5 is unchanged, which should be nearly everything', () => {
    const r = classify(
      [drive('1', 'AMBER JADE/SLAB.jpg', 'aaa')],
      [known('1', 'AMBER JADE/SLAB.jpg', 'aaa')],
    );
    expect(r[0]!.outcome).toBe('unchanged');
  });

  it('same id, different md5 is changed, so it is reprocessed', () => {
    const r = classify(
      [drive('1', 'AMBER JADE/SLAB.jpg', 'bbb')],
      [known('1', 'AMBER JADE/SLAB.jpg', 'aaa')],
    );
    expect(r[0]!.outcome).toBe('changed');
  });

  it('same id, different path is MOVED, not new plus missing', () => {
    // The distinction matters: a rename must not re download a 44MB file,
    // and must not look like a deletion.
    const r = classify(
      [drive('1', 'AMBER JADE/SLAB ON STAND.jpg', 'aaa')],
      [known('1', 'AMBER JADE/STAND ON SLAB.jpg', 'aaa')],
    );
    expect(r[0]!.outcome).toBe('moved');
    expect(r[0]!.previousPath).toBe('AMBER JADE/STAND ON SLAB.jpg');
    expect(summarise(r).missing).toBe(0);
    expect(summarise(r).new).toBe(0);
  });

  it('content change wins over a move, because content matters more', () => {
    const r = classify(
      [drive('1', 'NEW/PATH.jpg', 'bbb')],
      [known('1', 'OLD/PATH.jpg', 'aaa')],
    );
    expect(r[0]!.outcome).toBe('changed');
  });

  it('a vanished file is MISSING, and missing is only ever a flag', () => {
    // A vanished file is at least as likely to be an accidental drag as an
    // intent, and this dataset has already proved folders get moved by
    // mistake. Nothing is auto deleted on the strength of one listing.
    const r = classify([], [known('1', 'AMBER JADE/SLAB.jpg', 'aaa')]);
    expect(r).toHaveLength(1);
    expect(r[0]!.outcome).toBe('missing');
  });

  it('handles a realistic mixed run', () => {
    const listing = [
      drive('1', 'AMBER JADE/SLAB.jpg', 'aaa'),            // unchanged
      drive('2', 'AMBER JADE/APP 1.jpg', 'zzz'),           // changed
      drive('3', 'AMBER JADE/BOOK MATCH.jpg', 'ccc'),      // moved
      drive('4', 'STATUARIO/SLAB.jpg', 'ddd'),             // new
    ];
    const seen = [
      known('1', 'AMBER JADE/SLAB.jpg', 'aaa'),
      known('2', 'AMBER JADE/APP 1.jpg', 'bbb'),
      known('3', 'AMBER JADE/BOOKMATCH.jpg', 'ccc'),
      known('9', 'DELETED/GONE.jpg', 'eee'),               // missing
    ];
    expect(summarise(classify(listing, seen))).toEqual({
      new: 1, changed: 1, moved: 1, unchanged: 1, missing: 1,
    });
  });

  it('a null md5 does not cause a false change', () => {
    // Google Docs style files have no md5. Absence must not read as difference.
    const r = classify(
      [{ ...drive('1', 'A/B.jpg', ''), md5: null }],
      [{ ...known('1', 'A/B.jpg', ''), md5: null }],
    );
    expect(r[0]!.outcome).toBe('unchanged');
  });
});
