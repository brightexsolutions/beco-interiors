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

/**
 * Properties, not points. The matcher's whole design claim is "the token
 * SET, not the order", so these generate every ordering, arbitrary
 * duplication and every separator mix for a set of tokens and assert the
 * result never depends on any of that. A deterministic PRNG so a failure
 * is reproducible.
 */
const SEP = ['_', '-', '.', ' ', '  ', '_-'];

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** One scrambled filename from a token bag: shuffled, some tokens repeated,
    random separators, random case, a random extension. */
const scramble = (tokens: string[], rng: () => number): string => {
  const bag = [...tokens];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  for (const t of tokens) if (rng() < 0.3) bag.splice(Math.floor(rng() * bag.length), 0, t);
  const cased = bag.map((t) => (rng() < 0.5 ? t.toLowerCase() : t));
  const ext = ['.jpg', '.JPG', '.jpeg', '.png'][Math.floor(rng() * 4)];
  return cased.reduce((acc, t, i) =>
    i === 0 ? t : acc + SEP[Math.floor(rng() * SEP.length)] + t, '') + ext;
};

describe('resolveRole, order and separator invariance', () => {
  const cases: Array<{ tokens: string[]; folder: string; role: string }> = [
    { tokens: ['SLAB', 'ON', 'STAND'], folder: 'AMBER JADE', role: 'on_stand' },
    { tokens: ['STONE', 'ON', 'SLAB'], folder: 'AMBER JADE', role: 'on_stand' },
    { tokens: ['BOOK', 'MATCH'], folder: 'AMBER JADE', role: 'bookmatch' },
    { tokens: ['APP', '2'], folder: 'AMBER JADE', role: 'application' },
    { tokens: ['AMBER', 'JADE', 'SLAB'], folder: 'AMBER JADE', role: 'slab' },
    { tokens: ['AMBER', 'JADE'], folder: 'AMBER JADE', role: 'slab' },
  ];

  for (const { tokens, folder, role } of cases) {
    it(`[${tokens.join(' ')}] resolves to ${role} however it is scrambled`, () => {
      const rng = mulberry32(tokens.join().length * 7 + 1);
      for (let i = 0; i < 400; i++) {
        const name = scramble(tokens, rng);
        expect(resolveRole(name, folder), name).toBe(role);
      }
    });
  }

  it('never guesses a role for random noise', () => {
    const rng = mulberry32(99);
    const noise = 'QWXZKVBNPLMRTGHDFYUIOSA23456789';
    for (let i = 0; i < 500; i++) {
      const len = 4 + Math.floor(rng() * 12);
      let s = '';
      for (let j = 0; j < len; j++) s += noise[Math.floor(rng() * noise.length)];
      expect(resolveRole(`${s}.jpg`, 'AMBER JADE'), s).toBe('unknown');
    }
  });

  it('drops the on_stand role the moment a required token is missing', () => {
    // ON + STAND, or ON + SLAB, is what makes it on_stand. Take either away
    // and it must fall back, never stay on_stand on the strength of one word.
    expect(resolveRole('SLAB STAND.jpg', 'AMBER JADE')).not.toBe('on_stand');
    expect(resolveRole('STONE SLAB.jpg', 'AMBER JADE')).not.toBe('on_stand');
    expect(resolveRole('ON ONLY.jpg', 'AMBER JADE')).toBe('unknown');
  });
});
