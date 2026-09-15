/**
 * Contrast is VERIFIED, never assumed. Run: pnpm --filter @beco/ui check:contrast
 *
 * Warm Red on white is the pair that usually fails, which is why red is
 * reserved for fills, rules and large bold type rather than body text.
 */

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const luminance = (rgb: Rgb): number => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (fg: string, bg: string): number => {
  const l1 = luminance(hexToRgb(fg));
  const l2 = luminance(hexToRgb(bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/** AA: 4.5 for body, 3.0 for large text and UI edges. */
export const PAIRS: Array<{ name: string; fg: string; bg: string; min: number }> = [
  { name: 'body on white', fg: '#101820', bg: '#ffffff', min: 4.5 },
  { name: 'body on neutral-50', fg: '#101820', bg: '#f6f7f8', min: 4.5 },
  { name: 'muted on white', fg: '#6b757f', bg: '#ffffff', min: 4.5 },
  { name: 'white on charcoal', fg: '#ffffff', bg: '#101820', min: 4.5 },
  { name: 'warm red on white, LARGE only', fg: '#ed1c24', bg: '#ffffff', min: 3.0 },
  // Pure warm red carries white text at 4.38:1, below the 4.5 AA floor.
  // So text bearing surfaces use the deep variant instead.
  { name: 'white on warm red, LARGE bold only', fg: '#ffffff', bg: '#ed1c24', min: 3.0 },
  { name: 'white on warm-red-deep, buttons', fg: '#ffffff', bg: '#c81419', min: 4.5 },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = 0;
  for (const p of PAIRS) {
    const ratio = contrastRatio(p.fg, p.bg);
    const ok = ratio >= p.min;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2)}:1 (min ${p.min})  ${p.name}`);
  }
  if (failed) {
    console.error(`\n${failed} contrast pair(s) failed.`);
    process.exit(1);
  }
}
