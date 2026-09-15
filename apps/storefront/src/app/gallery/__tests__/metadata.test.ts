import { describe, expect, it } from 'vitest';
import { generateMetadata } from '../page';

const run = (params: Record<string, string | string[] | undefined>) =>
  generateMetadata({ searchParams: Promise.resolve(params) });

/**
 * D29: a filtered gallery view canonicalises to /gallery and carries
 * noindex, exactly like the shop's facets, so a project-type filter cannot
 * spawn thin duplicate URLs. The bare page stays fully indexable.
 */
describe('gallery generateMetadata', () => {
  it('leaves the bare gallery indexable with a self canonical', async () => {
    const meta = await run({});
    expect(meta.alternates?.canonical).toBe('/gallery');
    expect(meta.robots).toBeUndefined();
  });

  it('noindexes a type filtered view but keeps it canonical to /gallery', async () => {
    const meta = await run({ type: 'residential' });
    expect(meta.alternates?.canonical).toBe('/gallery');
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('treats a repeated param the same way, reading the first value', async () => {
    const meta = await run({ type: ['commercial', 'residential'] });
    expect(meta.robots).toMatchObject({ index: false });
  });

  it('noindexes even a junk type value, so a crawled bad link cannot be indexed', async () => {
    const meta = await run({ type: 'not-a-real-type' });
    expect(meta.alternates?.canonical).toBe('/gallery');
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });
});
