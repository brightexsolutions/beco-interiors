import type { StatCardIconTone } from '@beco/ui';

/** The kinds of figure the month tiles carry, each with a glyph and a chip tint. D143. */
export type HomeGlyph = 'won' | 'conversion' | 'invoiced' | 'leads' | 'catalogue';

const PATHS: Record<HomeGlyph, string> = {
  won: 'M20 7 9 18l-5-5',
  conversion: 'M4 17l6-6 4 4 6-7M14 8h6v6',
  invoiced: 'M4 7h16v12H4zM4 11h16M8 15h3',
  leads: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  catalogue: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
};

export const HOME_GLYPH_TONE: Record<HomeGlyph, StatCardIconTone> = {
  won: 'positive',
  conversion: 'info',
  invoiced: 'neutral',
  leads: 'danger',
  catalogue: 'warning',
};

export function HomeStatGlyph({ glyph }: { glyph: HomeGlyph }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[glyph]} />
    </svg>
  );
}
