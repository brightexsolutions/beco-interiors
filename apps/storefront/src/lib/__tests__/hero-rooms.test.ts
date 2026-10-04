import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_ROOMS } from '../hero-rooms';
import { RANGE_GROUPS } from '../ranges';

// jsdom hands this file an http import.meta.url, so resolve from wherever
// the run started: the repository root in CI, the app itself locally.
const publicDir = [resolve(process.cwd(), 'apps/storefront/public'), resolve(process.cwd(), 'public')].find((dir) =>
  existsSync(`${dir}/hero/rooms`),
)!;
/** CLAUDE.md, performance budgets: a hero image is under 150KB. */
const HERO_BUDGET = 150 * 1024;

describe('HERO_ROOMS', () => {
  it('holds every frame on disk and under the hero image budget', () => {
    for (const room of HERO_ROOMS) {
      for (const frame of [room.wide, room.tall]) {
        const size = statSync(`${publicDir}${frame.path}`).size;
        expect(size, frame.path).toBeLessThan(HERO_BUDGET);
      }
    }
  });

  it('cuts a 16:9 frame for desktop and a 3:4 frame for phones', () => {
    for (const room of HERO_ROOMS) {
      expect(room.wide.width / room.wide.height).toBeCloseTo(16 / 9, 2);
      expect(room.tall.width / room.tall.height).toBeCloseTo(3 / 4, 2);
    }
  });

  it('shows different rooms, never the same kind twice in a row', () => {
    const names = HERO_ROOMS.map((r) => r.room);
    expect(new Set(names).size).toBe(names.length);
    expect(HERO_ROOMS.length).toBeGreaterThanOrEqual(4);
  });

  it('names a material from a range we actually deal in, and a real description for the photo', () => {
    const ranges = new Set(RANGE_GROUPS.map((g) => g.slug as string));
    for (const room of HERO_ROOMS) {
      expect(ranges.has(room.rangeSlug), room.slug).toBe(true);
      expect(room.material.length).toBeGreaterThan(8);
      expect(room.alt.length).toBeGreaterThan(20);
      expect(`${room.room} ${room.material} ${room.alt}`).not.toMatch(new RegExp(String.fromCharCode(0x2014)));
    }
  });
});
