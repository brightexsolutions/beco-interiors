import sharp from 'sharp';

/**
 * Reads the finish of a piece of hardware from its photograph, D122.
 *
 * Beco's hinge photographs are phone shots named `IMG_1193.HEIC`, so nothing
 * in Drive says which hinge is which. Brown's instruction, 5 October: sort
 * them by colour so the range arrives organised, and the Beco team then sets
 * each one's code, name and price in the dashboard. This is that sort. It is
 * a first pass for a person to correct, never the final word: a hinge filed
 * under the wrong finish is moved in the product editor, and the importer
 * never moves it back (D54).
 *
 * How. The photograph is shrunk to 96px, the backdrop is read from its border
 * ring, and every pixel that stands clearly apart from the backdrop is the
 * subject. Each subject pixel votes for a finish by its CIELAB lightness and
 * hue; the finish with a clear majority wins. No majority, or no subject at
 * all, returns null, and the hinge stays in the range itself, unsorted,
 * rather than being guessed into a sub range.
 */

export const FINISHES = ['black', 'white', 'silver', 'gold', 'bronze', 'copper'] as const;
export type Finish = (typeof FINISHES)[number];

/** How a finish is written in a category or product name. */
export const FINISH_LABEL: Record<Finish, string> = {
  black: 'Black',
  white: 'White',
  silver: 'Silver',
  gold: 'Gold',
  bronze: 'Bronze',
  copper: 'Copper',
};

export interface FinishReading {
  finish: Finish | null;
  /** Share of subject pixels that voted for the winner, 0 to 1. */
  share: number;
  /** Share of the frame that read as subject rather than backdrop. */
  subject: number;
}

const SIDE = 96;
/** Under this CIELAB chroma a pixel is neutral: black, silver or white. */
const NEUTRAL_CHROMA = 12;
/** Below this share of the frame there is no subject to read. */
const MIN_SUBJECT = 0.03;
/** The winner must carry at least this share of the subject's votes. */
const MIN_SHARE = 0.45;
/** How far, in CIELAB, a pixel must sit from the backdrop to be subject. */
const SUBJECT_DISTANCE = 16;
/**
 * A neutral piece whose median lightness is under this share of the
 * backdrop's is dark metal, whatever its absolute lightness.
 *
 * Matte black and gunmetal hinges shot on a white sheet came out L 34 to 52,
 * not under 30: the camera exposes for the bright backdrop and the piece's
 * satin face mirrors it, so their pixels voted silver and IMG_1187, IMG_1307
 * and IMG_1308 were filed as Silver Hinges. Measured against the backdrop
 * they sit at 0.38 to 0.52 of its lightness, every silver hinge at 0.57 or
 * more, on white and on grey alike. A gunmetal lock or leg falls under it
 * too, which is where Brown wants gunmetal filed. See D122, 6 October.
 */
const DARK_RELATIVE = 0.545;
/** The share of the piece that must be neutral before it can read as dark metal,
    so a gold leg on a gunmetal bracket goes to the vote instead. */
const MIN_NEUTRAL = 0.8;

type Lab = [number, number, number];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export const rgbToLab = (r: number, g: number, b: number): Lab => {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/**
 * One pixel's vote. Neutral pixels split by lightness; coloured ones by hue.
 * A specular highlight on chrome reads near white and a shadow near black,
 * which is why the decision is a majority over the subject rather than an
 * average of it: an average of a polished hinge is a muddy grey.
 */
export const finishOfPixel = ([l, a, b]: Lab): Finish | null => {
  const chroma = Math.hypot(a, b);
  if (chroma < NEUTRAL_CHROMA) {
    if (l < 30) return 'black';
    if (l > 88) return 'white';
    return 'silver';
  }
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  if (hue >= 65 && hue <= 105) return l >= 50 ? 'gold' : 'bronze';
  if (hue >= 30 && hue < 65) return l >= 50 ? 'copper' : 'bronze';
  // Blue, green, purple: no hardware finish Beco stocks. Abstains.
  return null;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

export const readFinish = async (source: Buffer): Promise<FinishReading> => {
  const { data, info } = await sharp(source, { failOn: 'none', limitInputPixels: 2_000_000_000 })
    .rotate()
    .resize({ width: SIDE, height: SIDE, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const labs: Lab[] = [];
  for (let i = 0; i < data.length; i += info.channels) labs.push(rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!));

  // The backdrop is the median of the outer ring, three pixels deep. A
  // median, so a hinge that touches one edge does not drag it.
  const ring = 3;
  const border: Lab[] = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x < ring || y < ring || x >= info.width - ring || y >= info.height - ring) {
        border.push(labs[y * info.width + x]!);
      }
    }
  }
  const backdrop: Lab = [median(border.map((p) => p[0])), median(border.map((p) => p[1])), median(border.map((p) => p[2]))];

  const votes = new Map<Finish, number>();
  const neutralL: number[] = [];
  let subject = 0;
  for (const p of labs) {
    const distance = Math.hypot(p[0] - backdrop[0], p[1] - backdrop[1], p[2] - backdrop[2]);
    if (distance < SUBJECT_DISTANCE) continue;
    subject++;
    if (Math.hypot(p[1], p[2]) < NEUTRAL_CHROMA) neutralL.push(p[0]);
    const vote = finishOfPixel(p);
    if (vote) votes.set(vote, (votes.get(vote) ?? 0) + 1);
  }

  const subjectShare = subject / labs.length;
  if (subjectShare < MIN_SUBJECT) return { finish: null, share: 0, subject: subjectShare };

  // Dark metal, judged against the backdrop rather than on an absolute
  // scale, before the pixel vote. Its neutral pixels all count for black:
  // the ones that voted silver were the backdrop mirrored in its face.
  const neutralShare = neutralL.length / subject;
  if (neutralShare >= MIN_NEUTRAL && median(neutralL) < DARK_RELATIVE * backdrop[0]) {
    return { finish: 'black', share: neutralShare, subject: subjectShare };
  }

  let winner: Finish | null = null;
  let best = 0;
  for (const [finish, count] of votes) {
    if (count > best) {
      best = count;
      winner = finish;
    }
  }
  const share = best / subject;
  return { finish: share >= MIN_SHARE ? winner : null, share, subject: subjectShare };
};
