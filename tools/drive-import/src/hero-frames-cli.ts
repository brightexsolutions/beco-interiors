#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  cutHeroFrame,
  HERO_FRAMES,
  isHeroSlug,
  resolveHeroSource,
  type HeroCropPosition,
  type HeroFrameName,
} from './hero-frames';

/**
 * pnpm hero:frames <slug> <source> [--wide=west] [--tall=attention]
 *
 * <source> is `pexels:<id>`, an http URL, or a local file. Writes
 * `<slug>-wide.webp` and `<slug>-tall.webp` into the storefront's
 * `public/hero/rooms/`, then prints each size and the quality it took. The
 * room still has to be added to `HERO_ROOMS` by hand, with its caption,
 * alt text and credit, because those need a person to have looked at it.
 */
const POSITIONS = ['attention', 'entropy', 'centre', 'north', 'south', 'east', 'west'] as const;

const [slug, sourceArg, ...flags] = process.argv.slice(2);
if (!slug || !sourceArg || !isHeroSlug(slug)) {
  console.error('Usage: pnpm hero:frames <kebab-slug> <pexels:id | url | file> [--wide=<position>] [--tall=<position>]');
  process.exit(1);
}

const positionOf = (frame: HeroFrameName): HeroCropPosition => {
  const flag = flags.find((f) => f.startsWith(`--${frame}=`))?.split('=')[1] ?? 'attention';
  if (!(POSITIONS as readonly string[]).includes(flag)) {
    console.error(`--${frame} must be one of ${POSITIONS.join(', ')}`);
    process.exit(1);
  }
  return flag as HeroCropPosition;
};

const main = async () => {
  const source = resolveHeroSource(sourceArg);
  let body: Buffer;
  if (source.kind === 'url') {
    const res = await fetch(source.location);
    if (!res.ok) throw new Error(`${source.location} answered ${res.status}`);
    body = Buffer.from(await res.arrayBuffer());
  } else {
    body = await readFile(source.location);
  }

  const dir = new URL('../../../apps/storefront/public/hero/rooms/', import.meta.url);
  await mkdir(dir, { recursive: true });
  for (const name of Object.keys(HERO_FRAMES) as HeroFrameName[]) {
    const frame = await cutHeroFrame(body, name, positionOf(name));
    const out = new URL(`${slug}-${name}.webp`, dir);
    await writeFile(out, frame.body);
    console.log(`${out.pathname}  ${(frame.bytes / 1024).toFixed(1)}KB at quality ${frame.quality}`);
  }
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
