import { readFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { BRAND_FONT_FILES } from '@beco/documents/fonts';
import { OG_SIZE } from '../seo';

/**
 * The link preview card: a photograph, and under it a charcoal band carrying
 * the real Beco logo, an eyebrow and a title.
 *
 * Output is a baseline JPEG at 1200 by 630, held under 300KB. WhatsApp drops
 * a large image or a WebP one silently and shows a bare link, which is why
 * the catalogue's WebP derivatives are never handed to a scraper directly.
 *
 * The band is drawn by satori (`next/og`) in the brand's own self hosted
 * type, then laid over the photograph by sharp, which also does the JPEG
 * encode `next/og` cannot: it only writes PNG, and a 1200 by 630 PNG
 * photograph is several times the budget.
 */

export const BAND_HEIGHT = 152;
/** WhatsApp's practical ceiling for a preview image. */
export const OG_MAX_BYTES = 300 * 1024;

const CHARCOAL = '#101820';
const NEUTRAL_300 = '#b9c0c7';
const WHITE = '#ffffff';

const LOGO_FILE = new URL('../../../public/logo-mark.png', import.meta.url);
const LOGO_HEIGHT = BAND_HEIGHT - 48;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 400) / 390);

interface Assets {
  logo: string;
  fonts: { name: string; data: Buffer; weight: 400 | 500 | 600; style: 'normal' }[];
}

let assets: Promise<Assets> | undefined;

const loadAssets = (): Promise<Assets> =>
  (assets ??= Promise.all([
    readFile(LOGO_FILE),
    readFile(BRAND_FONT_FILES.titillium600),
    readFile(BRAND_FONT_FILES.cormorant500),
  ]).then(([logo, titillium600, cormorant500]) => ({
    logo: `data:image/png;base64,${logo.toString('base64')}`,
    fonts: [
      { name: 'Titillium', data: titillium600, weight: 600, style: 'normal' },
      { name: 'Cormorant', data: cormorant500, weight: 500, style: 'normal' },
    ],
  })));

export interface CardText {
  eyebrow: string;
  title: string;
}

const clamp = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/** The band alone, as a PNG, the width of the card. */
export const renderBand = async (text: CardText): Promise<Buffer> => {
  const { logo, fonts } = await loadAssets();
  const response = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          padding: '0 48px 0 24px',
          background: CHARCOAL,
        }}
      >
        {/* A plain <img>: satori draws this, next/image has no meaning here. */}
        <img src={logo} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32, flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Titillium',
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: 3.5,
              textTransform: 'uppercase',
              color: NEUTRAL_300,
            }}
          >
            {clamp(text.eyebrow, 60)}
          </div>
          <div
            style={{
              fontFamily: 'Cormorant',
              fontWeight: 500,
              fontSize: 54,
              lineHeight: 1.1,
              marginTop: 4,
              color: WHITE,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {clamp(text.title, 70)}
          </div>
        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: BAND_HEIGHT, fonts },
  );
  return Buffer.from(await response.arrayBuffer());
};

/**
 * The finished card. `photo` is any format sharp reads, WebP included.
 * Quality steps down only if a busy photograph would push the file past
 * the WhatsApp ceiling; most cards land well under it at the first step.
 */
export const renderOgCard = async (
  photo: Buffer | Uint8Array,
  text: CardText,
  position: 'centre' | 'top' | 'bottom' | 'attention' = 'centre',
): Promise<Buffer> => {
  const band = await renderBand(text);
  const base = await sharp(photo)
    .rotate()
    .resize(OG_SIZE.width, OG_SIZE.height, {
      fit: 'cover',
      position: position === 'attention' ? sharp.strategy.attention : position,
    })
    .composite([{ input: band, top: OG_SIZE.height - BAND_HEIGHT, left: 0 }])
    .flatten({ background: CHARCOAL })
    .toBuffer();

  let jpeg = Buffer.alloc(0);
  for (const quality of [82, 74, 66, 58]) {
    jpeg = await sharp(base)
      .jpeg({ quality, progressive: false, chromaSubsampling: '4:2:0' })
      .toBuffer();
    if (jpeg.byteLength <= OG_MAX_BYTES) break;
  }
  return jpeg;
};

/** Headers every card is served with. */
export const jpegResponse = (body: Buffer, maxAge = 86_400): Response =>
  new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(body.byteLength),
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`,
    },
  });
