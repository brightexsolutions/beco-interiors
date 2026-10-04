/**
 * Shared layout constants that are not design tokens, tied to a specific
 * structural pattern rather than the general spacing scale.
 */

/**
 * Aligns a full bleed hero's own type column with the site's 1380px grid,
 * matching every other section on the page, while the photograph behind it
 * still bleeds edge to edge. The `lg` step adds the section's own gutter,
 * 10rem (160px), matching `lg:px-40` everywhere else the 1380px container
 * is used, ON TOP OF the centering margin the 1380px cap produces past that
 * width, rather than taking whichever is larger: a `max()` of the two
 * undershoots the real gutter once the viewport passes 1380px, since the
 * centering margin alone does not include the section's own inner padding.
 *
 * Shared by `CinematicHero` and `HeroStatic` rather than each keeping its own
 * copy: both used to carry the site's very first, pre-widening gutter value
 * (`3.5rem` at `lg`, `pl-10` at `sm`) untouched through every later pass
 * that widened the gutter everywhere else, `px-40`/`px-24` among them,
 * reported directly against a screenshot as the hero's own left column
 * sitting visibly left of the header's logo above it. One constant now,
 * so a future widening pass cannot update one file and miss the other the
 * way this one did.
 */
export const HERO_GRID_INSET = 'pl-8 sm:pl-24 lg:pl-[calc(max(0px,(100vw-1380px)/2)+10rem)]';

/** The same gutter on the right, for the hero's caption and controls, D120. */
export const HERO_GRID_INSET_RIGHT = 'pr-8 sm:pr-24 lg:pr-[calc(max(0px,(100vw-1380px)/2)+10rem)]';
