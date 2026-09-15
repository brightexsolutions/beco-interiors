/**
 * Business facts, in one place.
 *
 * The contact block is CONFIRMED, per docs/CONTENT-AUDIT.md. The prototype
 * invented much of its content, but these came from real client contact.
 *
 * Anything unverified stays out of here entirely, so nothing on the site can
 * quietly assert something nobody has checked.
 */
export const SITE = {
  name: 'Beco Interiors',
  /** From the brand guideline strapline, on every page of it. */
  strapline: 'Sintered Stone · Lighting · Panels · Accessories',
  phone: '+254 722 333 730',
  phoneHref: 'tel:+254722333730',
  whatsapp: '254722333730',
  email: 'info@beco.co.ke',
  address: {
    line1: 'Urban Square, Shop 8 & 9',
    line2: 'Enterprise Road, Industrial Area',
    city: 'Nairobi',
  },
  /** Confirmed by Beco, 10 September 2026. Weekday and Saturday windows differ. */
  hours: 'Mon to Fri, 8am to 4pm. Sat, 8am to 2pm',
  hoursByDay: [
    ['Monday to Friday', '8am to 4pm'],
    ['Saturday', '8am to 2pm'],
  ] as const,
} as const;

/**
 * Beco's social profiles.
 *
 * Confirmed by Beco on 10 September 2026, in docs/BECO-COMPANY-PROFILE.md:
 * Instagram and TikTok are live, and no Facebook, YouTube or X account has
 * been opened. The three that do not exist are left out of the row entirely
 * rather than drawn as "coming soon" placeholders, since two real links now
 * carry it. `SocialLinks` still supports a null URL, per D48, if one is added
 * back before its account exists.
 *
 * Order is the order they appear.
 */
export const SOCIAL: { name: string; url: string | null }[] = [
  { name: 'Instagram', url: 'https://www.instagram.com/becointeriorskenya' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@beco.interiors' },
];

/**
 * The showroom film.
 *
 * Beco's own footage, from the SITE VIDEOS folder in Drive. Replaced 14
 * September with `beco-showroom-video`, a genuine landscape (1920x1080)
 * cinematic walkthrough uploaded that day, purpose shot rather than one of
 * the 52 portrait phone clips already there. Reported directly that the
 * portrait treatment undersold it, so both showroom sections that embed
 * this now use a wide frame instead of the tall one the old footage needed.
 *
 * The source arrives as QuickTime .MOV, HEVC, 1080p60, 54s, 114MB, which no
 * browser should be asked to download. This one is transcoded to H.264 MP4
 * at 1280x720/30fps, audio stripped since the element only ever plays
 * muted, 15MB, which is a real weight for a real clip rather than the
 * ambient loop's 1-2MB discipline: fine here because `ShowroomFilm` never
 * downloads more than the poster until the section is actually scrolled
 * into view. That transcode step is manual today; see docs/PLAN.md for
 * folding it into the import pipeline.
 */
export const SHOWROOM_FILM: { src: string; type: string; poster: string } | null = {
  src: '/video/showroom.mp4',
  type: 'video/mp4',
  poster: '/video/showroom-poster.jpg',
};

/**
 * The gallery's ambient video, full width, landscape.
 *
 * NOT Beco's own footage. Licensed stock, per D69: a deliberate reversal of
 * D51 and D62 for this one section specifically, made on direct instruction
 * after seeing an internal reference build of the treatment. D51 stands
 * everywhere else: `SHOWROOM_FILM` above is unchanged and is still Beco's
 * own portrait footage.
 *
 * Source: Pexels, "Modern Luxury Interiors with Spacious Design" by Ethan
 * Raven (pexels.com/@ravenpiks), video id 31617692. Pexels License: free for
 * commercial use, no attribution legally required, credited here anyway for
 * traceability. Downloaded via the verified redirect at
 * pexels.com/download/video/31617692/, which resolved to
 * videos.pexels.com/video-files/31617692/13470975_1920_1080_24fps.mp4, so
 * this is a real, licensed file rather than a guessed URL.
 *
 * Transcoded from the original 1920x1080, 7.6MB with audio, to 1280 wide,
 * silent, 2.3MB, matching the size discipline `SHOWROOM_FILM` was already
 * held to: a large muted background clip is not worth the weight, and a
 * Nairobi mobile connection is what this budget is set against.
 *
 * Replace this the moment Beco has real landscape footage. Nothing else on
 * the site depends on this constant, so retiring it is a one file change.
 */
export const GALLERY_FILM: { src: string; type: string; poster: string } | null = {
  src: '/video/gallery-ambient.mp4',
  type: 'video/mp4',
  poster: '/video/gallery-ambient-poster.jpg',
};

/**
 * Real, delivered work, captioned by room or application rather than by the
 * stone in it. A slab tells a buyer the veining. A room tells them whether
 * it works.
 *
 * The first two, `karen-kitchen-cyprus-grey` and `karen-vanity-sandstone-
 * beige`, are the only two files in the SITE PHOTOS Drive folder that ever
 * named both a stone and a room in the filename itself: "CYPRUS GREY, KAREN
 * KITCHEN" and "SANDSTONE BEIGE, KAREN VANITY". Every other file in that
 * folder, 75 of them, arrives as a bare camera filename such as
 * `IMG_4116.HEIC` with nothing to parse. The rest of this list is those:
 * downloaded, hand reviewed one by one at full resolution, and judged by eye
 * for what room or application each one actually shows, since nothing in
 * the filename says so. A first pass on small previews picked out about
 * fifteen; three of those did not survive a second look at full size, an
 * outdoor bar with exposed plumbing and a dangling wire still showing, a
 * console shot with moving boxes in frame, a vanity with bare wire hanging
 * off the wall, and were dropped. What is left is the roughly one in eight
 * that were genuinely presentable throughout the frame: in focus, well
 * composed, not a near duplicate angle of one already picked, nothing
 * unfinished or cluttered anywhere in shot. Quality over count, a smaller
 * set that is all real and all clear beats a longer one padded with weak
 * repeats.
 *
 * Converted by hand from the source HEIC (sharp's own HEIF decoder failed
 * on some of these files with a seek error; macOS `sips` handled every one)
 * and placed here rather than run through the product import pipeline,
 * since these are not products, they are proof of finished work.
 *
 * `productSlug` links a card through to the real catalogued stone shown in
 * it, when that stone can be identified with confidence. Left unset below
 * the first two entries: the stone in most of these photographs cannot be
 * matched to a catalogue slug with any certainty from a phone photo alone,
 * and a wrong link is worse than no link, so the card still names the room
 * honestly and simply is not linked. Add a `productSlug` for one of these,
 * or a new row entirely, the moment Beco confirms a match or names another
 * SITE PHOTOS file "STONE, LOCATION ROOM".
 */
export const SITE_SHOTS: { image: { path: string; alt: string; width: number; height: number }; room: string; productSlug?: string }[] = [
  {
    image: {
      path: '/site-photos/karen-kitchen-cyprus-grey.webp',
      alt: 'A kitchen counter in Cyprus Grey sintered stone, Karen, Nairobi',
      width: 1600, height: 2133,
    },
    room: 'Kitchen',
    productSlug: 'cyprus-light-grey',
  },
  {
    image: {
      path: '/site-photos/karen-vanity-sandstone-beige.webp',
      alt: 'A bathroom vanity counter in Sandstone Beige sintered stone, Karen, Nairobi',
      width: 1600, height: 2133,
    },
    room: 'Vanity',
    productSlug: 'sandstone-beige',
  },
  {
    image: {
      path: '/site-photos/kitchen-pendant-island.webp',
      alt: 'A stone kitchen island under pendant lighting, with a full run of cabinetry behind it',
      width: 1600, height: 2133,
    },
    room: 'Kitchen',
  },
  {
    image: {
      path: '/site-photos/kitchen-fluted-island.webp',
      alt: 'A stone kitchen island with a fluted panel face, set in a wide open plan kitchen',
      width: 1600, height: 2133,
    },
    room: 'Kitchen',
  },
  {
    image: {
      path: '/site-photos/kitchen-charcoal-island.webp',
      alt: 'A dark stone kitchen island with an integrated sink, against white cabinetry',
      width: 1600, height: 2133,
    },
    room: 'Kitchen',
  },
  {
    image: {
      path: '/site-photos/vanity-double-backlit.webp',
      alt: 'A double vanity counter in veined stone, with two vessel basins under backlit mirrors',
      width: 1600, height: 2133,
    },
    room: 'Vanity',
  },
  {
    image: {
      path: '/site-photos/vanity-gold-marble.webp',
      alt: 'A vanity counter in gold veined stone with a vessel basin, on a timber cabinet',
      width: 1600, height: 2133,
    },
    room: 'Vanity',
  },
  {
    image: {
      path: '/site-photos/vanity-floating-bronze.webp',
      alt: 'A floating stone vanity shelf with a bronze vessel basin',
      width: 1600, height: 2133,
    },
    room: 'Vanity',
  },
  {
    image: {
      path: '/site-photos/reception-curved-desk.webp',
      alt: 'A curved stone reception desk in an office lobby',
      width: 1600, height: 2133,
    },
    room: 'Reception',
  },
  {
    image: {
      path: '/site-photos/living-room-slat-wall.webp',
      alt: 'A living room feature wall in fluted timber panel, with a floating console beneath',
      width: 1600, height: 2133,
    },
    room: 'Living room',
  },
  {
    image: {
      path: '/site-photos/bar-travertine-counter.webp',
      alt: 'An L shaped bar counter in travertine look stone',
      width: 1600, height: 2133,
    },
    room: 'Bar',
  },
];

/** Prefilled, so a buyer never has to explain what they are asking about. */
export const whatsappLink = (context?: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    context ? `Hi Beco, I would like to ask about ${context}.` : 'Hi Beco, I would like to enquire.',
  )}`;
