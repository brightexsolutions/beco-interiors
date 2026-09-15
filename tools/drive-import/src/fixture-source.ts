import type { DriveSource } from './drive';
import type { DriveFile } from './classify';
import type { FolderNode } from './misnest';

/**
 * A DriveSource built from the real 29 August export, including every defect.
 *
 * Lets the whole pipeline run end to end with no service account and no
 * network, which is how M2 was built before the account existed. It is also
 * what CI uses, since CI must never reach a real Drive folder.
 */
const STONES = [
  'AMBER JADE', 'BEVERLY GOLD', 'BIANCO FENDI', 'BVLGARI', 'CALCATTA GOLD', 'CALCATTA ORO',
  'CYPRUS LIGHT GREY', 'ETEREO', 'GALAXY BIANCO', 'JATOBA BROWN', 'LIMESTONE BEIGE',
  'LIMESTONE CREAMY', 'LIMESTONE IVORY', 'MOIRE WHITE', 'PRECIOUS BLACK', 'PURE WHITE',
  'ROME PHANTOM IVORY', 'SABNIS', 'SANDSTONE BEIGE', 'SANDSTONE IVORY', 'STATUARIO',
  'STATUARIO GOLD', 'TAJ MAHAL', 'TRAVERTINE BEIGE',
];
const BOOKMATCH = new Set([
  'BEVERLY GOLD', 'BIANCO FENDI', 'CALCATTA GOLD', 'CALCATTA ORO',
  'ROME PHANTOM IVORY', 'STATUARIO', 'STATUARIO GOLD',
]);
/** Confirmed against live Drive: these three have no on stand file by name. */
const NO_ON_STAND = new Set(['MOIRE WHITE', 'PURE WHITE', 'SANDSTONE IVORY']);
const CATEGORY = '12MM SINTERED STONES';

export const createFixtureSource = (): DriveSource => {
  const files: DriveFile[] = [];
  let n = 0;
  const add = (path: string, size = 9_000_000) =>
    files.push({
      id: `fixture-${++n}`,
      path,
      md5: `md5-${n}`,
      size,
      modifiedTime: '2026-08-29T07:51:36Z',
    });

  for (const stone of STONES) {
    const base = `${CATEGORY}/${stone}`;
    if (stone === 'BEVERLY GOLD') add(`${base}/BEVERLY GOLD.jpg`);          // no SLAB word
    else if (stone === 'LIMESTONE CREAMY') add(`${base}/DSC02078.JPG`);     // raw camera name
    else if (stone === 'SANDSTONE BEIGE') {
      // Supplier filenames with no role word. Cannot be placed automatically.
      add(`${base}/2201632A01171.jpg`);
      add(`${base}/Sandstone Beige 2201632A01171.jpg`);
    } else add(`${base}/${stone} SLAB.jpg`, 44_000_000);                    // up to 44MB

    if (!NO_ON_STAND.has(stone)) {
      // Three different names for the same photograph, all in the real export.
      const variant =
        stone === 'BVLGARI' ? 'STAND ON SLAB.JPG'
        : stone === 'STATUARIO GOLD' ? 'STONE ON SLAB.png'
        : 'SLAB ON STAND.JPG';
      add(`${base}/${variant}`);
    }
    if (BOOKMATCH.has(stone)) {
      add(`${base}/${stone === 'BEVERLY GOLD' ? 'BEVERLY GOLD BOOKMATCH.jpg' : 'BOOK MATCH.jpg'}`);
    }
    for (let i = 1; i <= 3; i++) add(`${base}/APP ${i}.jpg`);
  }

  // The real misnesting: two products filed inside a third, byte identical.
  add(`${CATEGORY}/AMBER JADE/CYPRUS LIGHT GREY/CYPRUS LIGHT GREY SLAB.jpg`);
  add(`${CATEGORY}/AMBER JADE/GALAXY BIANCO/GALAXY BIANCO SLAB.png`);
  add(`${CATEGORY}/.DS_Store`, 6148);

  const folders: FolderNode[] = [
    ...STONES.map((s) => ({ path: s, name: s, depth: 1 })),
    { path: 'AMBER JADE/CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 2 },
    { path: 'AMBER JADE/GALAXY BIANCO', name: 'GALAXY BIANCO', depth: 2 },
  ];

  return {
    listAll: async () => files,
    listFolders: async () => folders,
    download: async () => {
      throw new Error('The fixture source has no real image bytes. Use --dry-run.');
    },
  };
};
