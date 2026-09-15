/**
 * The palette, in one place.
 *
 * tokens.css must contain these exact values. A test asserts it, so the
 * stylesheet and the contrast checker cannot drift apart.
 *
 * Source: Beco brand guideline, April 2025. THREE colours, no secondary,
 * deliberately. See docs/BRAND-GUIDELINE-NOTES.md and D2.
 *
 * TODO M3: these are approximate conversions of Pantone Red C and Black 6C.
 * Verify against pages 20 and 21 of the guideline before launch.
 */
export const PALETTE = {
  warmRed: '#ed1c24',
  /** Warm Red at full saturation carries white text at only 4.38:1, below the
   *  4.5 AA floor. So text bearing surfaces use this deeper variant instead. */
  warmRedDeep: '#c81419',
  /** A COOL black. The guideline calls it "a cooling counter to our warming red". */
  charcoal: '#101820',
  highVisWhite: '#ffffff',
  neutral950: '#0b1119',
  neutral900: '#101820',
  neutral700: '#333d47',
  neutral500: '#6b757f',
  neutral300: '#b9c0c7',
  neutral200: '#d7dce0',
  neutral100: '#eceef0',
  neutral50: '#f6f7f8',
  success: '#16a34a',
  error: '#dc2626',
  whatsapp: '#25d366',
} as const;
