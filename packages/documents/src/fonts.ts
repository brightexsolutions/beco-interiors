/**
 * The brand's own TTF files, as URLs.
 *
 * These are the same subsets the site serves as woff2, flavor-stripped to
 * TTF because two renderers here cannot read woff2: @react-pdf/renderer for
 * quotes, and satori inside `next/og` for the storefront's link preview
 * cards. One copy of the files, one place that names them, so the preview
 * card and the PDF cannot drift onto different type.
 *
 * Written as `new URL(literal, import.meta.url)` on purpose: that is the
 * form Next's bundler follows to copy an asset into the server output, so a
 * route that reads these at request time still finds them once deployed.
 */
export const BRAND_FONT_FILES = {
  titillium400: new URL('./pdf/fonts/titillium-400.ttf', import.meta.url),
  titillium600: new URL('./pdf/fonts/titillium-600.ttf', import.meta.url),
  cormorant400: new URL('./pdf/fonts/cormorant-400.ttf', import.meta.url),
  cormorant500: new URL('./pdf/fonts/cormorant-500.ttf', import.meta.url),
} as const;
