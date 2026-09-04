import { describe, expect, it } from 'vitest';
import { cn } from '../cn';

/**
 * `cn` exists to merge Tailwind classes, later ones winning over earlier
 * ones for the same utility. Every crossfade in the codebase depends on
 * this specifically for opacity: a hardcoded base opacity plus a
 * conditional one is the exact bug D67 found, where the compiled
 * stylesheet's own rule order, not this merge, decided which won and froze
 * a photograph mid-fade. This is the guarantee that lets a base opacity
 * class sit beside a conditional override without D67 happening again.
 */
describe('cn', () => {
  it('keeps only the later opacity utility when two are given', () => {
    expect(cn('opacity-50', 'opacity-0')).toBe('opacity-0');
  });

  it('resolves the same way inside a longer class string', () => {
    expect(cn('object-cover opacity-50 transition-opacity', 'opacity-0')).toBe(
      'object-cover transition-opacity opacity-0',
    );
  });

  it('keeps the base opacity when no override is given', () => {
    expect(cn('object-cover opacity-50 transition-opacity', undefined)).toBe(
      'object-cover opacity-50 transition-opacity',
    );
  });
});
