import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from '@react-pdf/renderer';

const here = dirname(fileURLToPath(import.meta.url));

let registered = false;

/**
 * Embed Titillium and Cormorant so a quote opened on a phone that has
 * neither still looks like Beco. Called once per process.
 *
 * Use TTF, not the site's woff2 subsets. @react-pdf/renderer embeds woff2
 * with empty glyph outlines, so the PDF draws rules and the logo and no
 * letters. fontTools flavor-strip of the same files is the source of these
 * TTF copies.
 */
export function registerQuoteFonts(): void {
  if (registered) return;
  Font.register({
    family: 'Titillium',
    fonts: [
      { src: join(here, 'fonts/titillium-400.ttf'), fontWeight: 400 },
      { src: join(here, 'fonts/titillium-600.ttf'), fontWeight: 600 },
    ],
  });
  Font.register({
    family: 'Cormorant',
    fonts: [
      { src: join(here, 'fonts/cormorant-400.ttf'), fontWeight: 400 },
      { src: join(here, 'fonts/cormorant-500.ttf'), fontWeight: 500 },
    ],
  });
  registered = true;
}

export const logoPath = join(here, 'assets/logo-mark.png');
