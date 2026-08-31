import { describe, expect, it } from 'vitest';
import { resolveRole } from '../roles';

/**
 * Fixtures are the REAL filenames found in the 29 August Drive export,
 * including every defect. A future change to the matcher cannot silently
 * start guessing without failing here.
 */
describe('resolveRole', () => {
  it('resolves the standard names', () => {
    expect(resolveRole('AMBER JADE SLAB.jpg', 'AMBER JADE')).toBe('slab');
    expect(resolveRole('SLAB ON STAND.jpg', 'AMBER JADE')).toBe('on_stand');
    expect(resolveRole('APP 1.jpg', 'AMBER JADE')).toBe('application');
    expect(resolveRole('BOOK MATCH.png', 'BIANCO FENDI')).toBe('bookmatch');
  });

  it('matches the token SET, not the order', () => {
    // All three of these appear in the real export and mean the same photograph.
    expect(resolveRole('SLAB ON STAND.JPG', 'BVLGARI')).toBe('on_stand');
    expect(resolveRole('STAND ON SLAB.JPG', 'BVLGARI')).toBe('on_stand');
    expect(resolveRole('STONE ON SLAB.png', 'STATUARIO GOLD')).toBe('on_stand');
  });

  it('handles bookmatch spelled both ways and prefixed', () => {
    expect(resolveRole('BOOKMATCH.jpg', 'BEVERLY GOLD')).toBe('bookmatch');
    expect(resolveRole('BEVERLY GOLD BOOKMATCH.jpg', 'BEVERLY GOLD')).toBe('bookmatch');
    expect(resolveRole('BOOK MATCH.jpg', 'CALCATTA ORO')).toBe('bookmatch');
  });

  it('treats a filename repeating the folder name as the slab shot', () => {
    // Real cases: the slab shot named only after the product.
    expect(resolveRole('BEVERLY GOLD.jpg', 'BEVERLY GOLD')).toBe('slab');
    expect(resolveRole('STATUARIO GOLD.jpg', 'STATUARIO GOLD')).toBe('slab');
  });

  it('is case and separator insensitive', () => {
    expect(resolveRole('slab_on_stand.jpeg', 'ETEREO')).toBe('on_stand');
    expect(resolveRole('app-2.JPG', 'ETEREO')).toBe('application');
  });

  it('NEVER guesses. Unrecognised names resolve to unknown', () => {
    // A raw camera filename. Real case in LIMESTONE CREAMY.
    expect(resolveRole('DSC02078.JPG', 'LIMESTONE CREAMY')).toBe('unknown');
    // Supplier filenames with no role word. Real case in SANDSTONE BEIGE.
    expect(resolveRole('2201632A01171.jpg', 'SANDSTONE BEIGE')).toBe('unknown');
    expect(resolveRole('IMG_4821.jpg', 'PURE WHITE')).toBe('unknown');
  });

  it('does not mistake a partial folder match for a slab', () => {
    // "SANDSTONE" alone is not the whole folder name, so it must not resolve.
    expect(resolveRole('SANDSTONE.jpg', 'SANDSTONE BEIGE')).toBe('unknown');
  });
});
