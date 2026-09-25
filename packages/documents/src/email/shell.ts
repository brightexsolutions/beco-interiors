/**
 * The branded shell every transactional email renders inside, so a
 * confirmation, a priced quote and a receipt read as the same company
 * rather than three ad hoc messages.
 *
 * Hand built table markup, not a component library. `@react-email/components`
 * was tried first and dropped: its published versions, including the latest,
 * carry npm's own "no longer supported" deprecation notice with no
 * replacement named, not something to pin a live client-facing send path to
 * without a clearer reason than convenience. Table based layout with inline
 * styles is the actual cross-client requirement underneath that library
 * anyway (Outlook's Word rendering engine understands neither flexbox nor a
 * `<div>` grid), and three short templates do not need a dependency to get
 * there by hand.
 *
 * Colours are the same four constants `pdf/quote-document.tsx` already
 * hardcodes for the same reason: this is the document-safe subset of the
 * full site palette, not the whole `@beco/ui` token set, which this package
 * has no reason to depend on. Fonts are a fallback stack, not the real
 * Titillium and Cormorant files the PDF embeds: those are self hosted via
 * `next/font/local` with a content hashed filename that changes on every
 * build, so there is no stable URL an email's own `@font-face` could point
 * at without a second, dedicated hosting path nobody has built. Most inboxes
 * ignore `@font-face` in HTML mail regardless, Outlook desktop entirely, so
 * the fallback stack is not a workaround for a missing asset, it is the
 * actual state of the art for branded email.
 */

export const CHARCOAL = '#101820';
/** The text safe variant, same reason button.tsx uses it: pure Warm Red
 *  carries white text at 4.38:1, under the 4.5 AA floor. */
export const WARM_RED = '#c81419';
export const MUTED = '#6b757f';
export const RULE = '#d7dce0';
export const PAPER = '#ffffff';

/** Titillium is a humanist grotesque; this stack is the closest a system
 *  font gets without embedding it. */
export const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Cormorant is a display garamond; Georgia is the nearest safe serif every
 *  mail client already has, used only for the one display moment per
 *  template, never for body copy. */
export const SERIF = "Georgia,'Times New Roman',serif";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The storefront's own origin, so the header logo resolves to a real,
 *  publicly reachable image: an email client can never load a relative or
 *  a build time local path. Falls back to the live domain rather than
 *  localhost, so a misconfigured environment still sends a working image
 *  in the one place that matters, production. */
export const siteUrl = (): string => (process.env.STOREFRONT_URL || 'https://www.beco.co.ke').replace(/\/$/, '');

export const PHONE_DISPLAY = '+254 722 333 730';
export const PHONE_HREF = 'tel:+254722333730';
export const ADDRESS_LINE = 'Urban Square, Enterprise Road, Industrial Area, Nairobi';

/**
 * The uppercase, letterspaced red label above a heading, the same rhythm
 * `PageHeader` uses on the storefront: eyebrow, then the actual line. Kept
 * to one appearance per email, the only Warm Red in the whole document
 * besides the logo mark, so the rationing the brand guideline asks for on
 * every other surface holds here too.
 */
export function eyebrow(text: string): string {
  return (
    `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;font-weight:600;` +
    `letter-spacing:0.14em;text-transform:uppercase;color:${WARM_RED}">${escapeHtml(text)}</p>`
  );
}

/** The one display moment per template: the serif fallback, set large,
 *  standing in for Cormorant the way the storefront's own Cormorant
 *  headings open a section. */
export function heading(html: string): string {
  return (
    `<p style="margin:0 0 16px;font-family:${SERIF};font-size:24px;line-height:1.3;` +
    `font-weight:500;color:${CHARCOAL}">${html}</p>`
  );
}

export function paragraph(html: string): string {
  return (
    `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;` +
    `color:${CHARCOAL}">${html}</p>`
  );
}

/**
 * A bordered, sharp cornered box naming the one thing every one of these
 * emails exists to hand over: the reference. Sharp, not rounded, the same
 * corner rule the storefront and the PDF both hold to, D2's own "a sharp
 * edge reads more deliberate than a blur", so the document does not
 * introduce a shape the rest of the brand refuses.
 */
export function referenceBox(label: string, value: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:0 0 20px;border:1px solid ${RULE}"><tr><td style="padding:16px 20px">` +
    `<p style="margin:0 0 4px;font-family:${SANS};font-size:11px;font-weight:600;` +
    `letter-spacing:0.12em;text-transform:uppercase;color:${MUTED}">${escapeHtml(label)}</p>` +
    `<p style="margin:0;font-family:${SANS};font-size:20px;font-weight:600;color:${CHARCOAL}">` +
    `${escapeHtml(value)}</p></td></tr></table>`
  );
}

/**
 * The full document: doctype, head, the branded header and footer around
 * whatever body content a template supplies. One shell, so a change to how
 * Beco's mark or footer reads happens once, not three times.
 */
export function renderEmailShell({ preview, bodyHtml }: { preview: string; bodyHtml: string }): string {
  const logo = `${siteUrl()}/logo-mark.png`;

  return (
    '<!doctype html>' +
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
    '<meta name="color-scheme" content="light">' +
    '<meta name="supported-color-schemes" content="light">' +
    '<title>Beco Interiors</title>' +
    '<style>' +
    'body,table,td{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}' +
    'table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}' +
    'img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}' +
    'body{margin:0;padding:0;width:100%!important;background:' + PAPER + '}' +
    '</style>' +
    '</head>' +
    `<body style="margin:0;padding:0;background:${PAPER}">` +
    // The preheader: the line an inbox list shows beside the subject,
    // before the message opens. Hidden from the rendered message itself,
    // and padded with zero width joiners so a client cannot fall through
    // to pulling in the first real line of body copy instead.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">` +
    `${escapeHtml(preview)}${'&zwnj;&nbsp;'.repeat(40)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER}">` +
    '<tr><td align="center" style="padding:32px 16px">' +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    'style="max-width:520px;width:100%">' +
    // Header: the mark, then the wordmark as real text, never baked into
    // the image, so it survives a client that blocks images.
    `<tr><td style="padding:0 8px 24px;border-bottom:1px solid ${RULE}">` +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td style="padding-right:10px"><img src="${logo}" width="28" height="27" alt="Beco" ` +
    'style="display:block;width:28px;height:27px"></td>' +
    `<td style="font-family:${SANS};font-size:16px;line-height:27px;color:${CHARCOAL}">` +
    `<span style="font-weight:700">BECO</span> <span style="font-weight:400;letter-spacing:0.06em">INTERIORS</span>` +
    '</td></tr></table></td></tr>' +
    // Body
    `<tr><td style="padding:32px 8px">${bodyHtml}</td></tr>` +
    // Footer
    `<tr><td style="padding:20px 8px 0;border-top:1px solid ${RULE}">` +
    `<p style="margin:0 0 4px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">Beco Interiors</p>` +
    `<p style="margin:0 0 4px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">${escapeHtml(ADDRESS_LINE)}</p>` +
    `<p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6"><a href="${PHONE_HREF}" ` +
    `style="color:${WARM_RED};text-decoration:none">${PHONE_DISPLAY}</a></p>` +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>'
  );
}
