/**
 * The branded shell every transactional email renders inside, so a
 * confirmation, a priced quote and a receipt read as the same company.
 *
 * Layout: a quiet grey canvas, one 600px white card. A charcoal band carries
 * the red square mark and the wordmark as real text, then a single Warm Red rule,
 * the only red in the message besides the eyebrow. The body leads with an
 * eyebrow and a serif heading, the reference sits in its own card, and the
 * two ways to reach a person (call, WhatsApp) are real buttons. The footer
 * is the showroom: address, hours, phone, site.
 *
 * Hand built table markup with inline styles, because that is what Gmail,
 * Apple Mail and Outlook's Word engine all agree on; `@react-email` was
 * tried first and dropped for its deprecation notice. Sharp corners
 * throughout, the brand's corner rule (D2, D92). Every size is 14px or more,
 * the project's small print floor, with body copy at 16px.
 */

export const CHARCOAL = '#101820';
/** The text safe variant, same reason button.tsx uses it: pure Warm Red
 *  carries white text at 4.38:1, under the 4.5 AA floor. */
export const WARM_RED = '#c81419';
export const MUTED = '#5c6670';
export const RULE = '#e2e6e9';
export const PAPER = '#ffffff';
export const CANVAS = '#f2f3f4';
export const PANEL = '#f7f8f8';

/** Titillium is a humanist grotesque; this stack is the closest a system
 *  font gets without embedding it. */
export const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Cormorant is a display garamond; Georgia is the nearest safe serif every
 *  mail client already has, used only for display moments. */
export const SERIF = "Georgia,'Times New Roman',serif";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The storefront's own origin, so images resolve to a real, publicly
 *  reachable URL: an email client can never load a relative path. Falls back
 *  to the live domain rather than localhost. */
export const siteUrl = (): string => (process.env.STOREFRONT_URL || 'https://www.beco.co.ke').replace(/\/$/, '');

export const PHONE_DISPLAY = '+254 722 333 730';
export const PHONE_HREF = 'tel:+254722333730';
export const WHATSAPP_HREF = 'https://wa.me/254722333730';
export const ADDRESS_LINE = 'Urban Square, Enterprise Road, Industrial Area, Nairobi';
export const HOURS_LINE = 'Mon to Fri 8am to 4pm, Sat 8am to 2pm';

const text = (size: number, color: string, extra = '') =>
  `font-family:${SANS};font-size:${size}px;line-height:1.6;color:${color};${extra}`;

/** The uppercase, letterspaced red label above a heading. One per email. */
export function eyebrow(label: string): string {
  return (
    `<p style="margin:0 0 12px;${text(14, WARM_RED, 'font-weight:600;letter-spacing:0.16em;text-transform:uppercase')}">` +
    `${escapeHtml(label)}</p>`
  );
}

/** The one display moment per template, the serif standing in for Cormorant. */
export function heading(html: string): string {
  return (
    `<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:30px;line-height:1.2;` +
    `font-weight:400;color:${CHARCOAL}">${html}</h1>`
  );
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;${text(16, CHARCOAL)}">${html}</p>`;
}

/**
 * The reference card. A charcoal bar on the left edge marks it as the one
 * thing to keep; optional rows beneath carry what goes with it (validity, a
 * payment date).
 */
export function referenceBox(label: string, value: string, rows: Array<[string, string]> = []): string {
  const detail = rows
    .map(
      ([key, val]) =>
        `<tr><td style="padding:8px 0 0;${text(14, MUTED)}">${escapeHtml(key)}</td>` +
        `<td align="right" style="padding:8px 0 0;${text(14, CHARCOAL, 'font-weight:600')}">${escapeHtml(val)}</td></tr>`,
    )
    .join('');
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:8px 0 24px;border:1px solid ${RULE};border-left:4px solid ${CHARCOAL};background:${PANEL}">` +
    '<tr><td style="padding:18px 20px">' +
    `<p style="margin:0 0 4px;${text(14, MUTED, 'font-weight:600;letter-spacing:0.12em;text-transform:uppercase')}">` +
    `${escapeHtml(label)}</p>` +
    `<p style="margin:0;font-family:${SANS};font-size:24px;line-height:1.3;font-weight:700;letter-spacing:0.02em;color:${CHARCOAL}">` +
    `${escapeHtml(value)}</p>` +
    (detail
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
        `style="margin-top:10px;border-top:1px solid ${RULE}">${detail}</table>`
      : '') +
    '</td></tr></table>'
  );
}

/** A small uppercase label that opens a block inside the body. */
export function sectionLabel(label: string): string {
  return (
    `<p style="margin:0 0 12px;${text(14, MUTED, 'font-weight:600;letter-spacing:0.12em;text-transform:uppercase')}">` +
    `${escapeHtml(label)}</p>`
  );
}

/** A named attachment, so the reader knows to look for the file. */
export function attachmentNote(filename: string, caption: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">` +
    '<tr>' +
    `<td width="44" valign="top" style="padding:2px 12px 0 0">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" style="width:32px;height:40px;border:1px solid ${CHARCOAL};${text(14, CHARCOAL, 'font-weight:700;line-height:40px')}">PDF</td>` +
    '</tr></table></td>' +
    `<td valign="top"><p style="margin:0;${text(16, CHARCOAL, 'font-weight:600;word-break:break-word')}">${escapeHtml(filename)}</p>` +
    `<p style="margin:0;${text(14, MUTED)}">${escapeHtml(caption)}</p></td>` +
    '</tr></table>'
  );
}

/** Numbered next steps, so a reader knows what happens without a paragraph. */
export function steps(items: string[]): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">` +
    items
      .map(
        (item, i) =>
          '<tr>' +
          `<td width="36" valign="top" style="padding:0 0 12px">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
          `<td align="center" style="width:26px;height:26px;background:${CHARCOAL};${text(14, PAPER, 'font-weight:700;line-height:26px')}">${i + 1}</td>` +
          '</tr></table></td>' +
          `<td valign="top" style="padding:1px 0 12px;${text(16, CHARCOAL)}">${escapeHtml(item)}</td>` +
          '</tr>',
      )
      .join('') +
    '</table>'
  );
}

/**
 * Bulletproof buttons: a table cell with padding, not a styled link alone,
 * so Outlook keeps the shape. Primary is charcoal, secondary is outlined.
 */
export function buttons(items: Array<{ label: string; href: string; primary?: boolean }>): string {
  const cells = items
    .map(({ label, href, primary }) => {
      const bg = primary ? CHARCOAL : PAPER;
      const fg = primary ? PAPER : CHARCOAL;
      return (
        `<td class="beco-stack" style="padding:0 8px 8px 0">` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
        `<td style="background:${bg};border:1px solid ${CHARCOAL}">` +
        `<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;${text(16, fg, 'font-weight:600;line-height:1.2;text-decoration:none;letter-spacing:0.02em;white-space:nowrap')}">` +
        `${escapeHtml(label)}</a></td></tr></table></td>`
      );
    })
    .join('');
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px"><tr>${cells}<td style="width:100%"></td></tr></table>`
  );
}

/** A thin rule between the message and its sign off. */
export const divider = (): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">` +
  `<tr><td style="border-top:1px solid ${RULE};font-size:0;line-height:0">&nbsp;</td></tr></table>`;

/** The sign off every message ends on: a person, not a no-reply. */
export const signOff = (): string =>
  `<p style="margin:0;${text(16, CHARCOAL)}">Talk soon,</p>` +
  `<p style="margin:0;${text(16, CHARCOAL, 'font-weight:600')}">The Beco Interiors team</p>`;

/** The two ways to reach a person, used by every template. */
export const contactButtons = (whatsappText: string): string =>
  buttons([
    { label: 'Call the showroom', href: PHONE_HREF, primary: true },
    { label: 'WhatsApp us', href: `${WHATSAPP_HREF}?text=${encodeURIComponent(whatsappText)}` },
  ]);

/**
 * The full document: doctype, head, the branded header and footer around
 * whatever body content a template supplies.
 */
export function renderEmailShell({ preview, bodyHtml }: { preview: string; bodyHtml: string }): string {
  const site = siteUrl();
  // The brand mark: white letters on the Warm Red square, the same file
  // the PDF header and the site favicon use.
  const logo = `${site}/logo-mark.png`;

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
    `body{margin:0;padding:0;width:100%!important;background:${CANVAS}}` +
    'a{color:inherit}' +
    '@media only screen and (max-width:620px){' +
    '.beco-pad{padding-left:24px!important;padding-right:24px!important}' +
    '.beco-stack{display:block!important;width:100%!important;padding-right:0!important}' +
    '.beco-stack table,.beco-stack a{width:100%!important;box-sizing:border-box;text-align:center}' +
    '.beco-hide{display:none!important}' +
    '}' +
    '</style>' +
    '</head>' +
    `<body style="margin:0;padding:0;background:${CANVAS}">` +
    // The preheader: the line an inbox list shows beside the subject.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">` +
    `${escapeHtml(preview)}${'&zwnj;&nbsp;'.repeat(40)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS}">` +
    '<tr><td align="center" style="padding:32px 12px">' +
    '<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="max-width:600px;width:100%;background:${PAPER}">` +
    // Header band: the white mark and the wordmark as real text, so it
    // survives a client that blocks images.
    `<tr><td class="beco-pad" style="background:${CHARCOAL};padding:24px 40px">` +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td style="padding-right:14px"><img src="${logo}" width="40" height="39" alt="Beco" ` +
    'style="display:block;width:40px;height:39px"></td>' +
    `<td style="font-family:${SANS};font-size:16px;line-height:39px;color:${PAPER};letter-spacing:0.08em">` +
    '<span style="font-weight:700">BECO</span> <span style="font-weight:400">INTERIORS</span>' +
    '</td></tr></table></td>' +
    `<td class="beco-hide" align="right" valign="middle" style="${text(14, '#c4cad0')}">` +
    `<a href="${site}" style="color:#c4cad0;text-decoration:none">beco.co.ke</a></td>` +
    '</tr></table></td></tr>' +
    `<tr><td style="background:${WARM_RED};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>` +
    // Body
    `<tr><td class="beco-pad" style="padding:40px 40px 32px">${bodyHtml}</td></tr>` +
    // Footer: the showroom
    `<tr><td class="beco-pad" style="background:${PANEL};border-top:1px solid ${RULE};padding:28px 40px">` +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td class="beco-stack" valign="top" style="padding:0 16px 12px 0">' +
    `<p style="margin:0 0 4px;${text(14, MUTED, 'font-weight:600;letter-spacing:0.12em;text-transform:uppercase')}">Showroom</p>` +
    `<p style="margin:0;${text(14, CHARCOAL)}">${escapeHtml(ADDRESS_LINE)}</p>` +
    `<p style="margin:0;${text(14, MUTED)}">${escapeHtml(HOURS_LINE)}</p>` +
    '</td>' +
    '<td class="beco-stack" valign="top" style="padding:0 0 12px">' +
    `<p style="margin:0 0 4px;${text(14, MUTED, 'font-weight:600;letter-spacing:0.12em;text-transform:uppercase')}">Talk to us</p>` +
    `<p style="margin:0;${text(14, CHARCOAL)}"><a href="${PHONE_HREF}" style="color:${CHARCOAL};text-decoration:none;font-weight:600">${PHONE_DISPLAY}</a></p>` +
    `<p style="margin:0;${text(14, CHARCOAL)}"><a href="${site}" style="color:${CHARCOAL};text-decoration:underline">www.beco.co.ke</a></p>` +
    '</td>' +
    '</tr></table>' +
    `<p style="margin:12px 0 0;${text(14, MUTED)}">Beco Interiors Limited. You are receiving this because you asked us for a quote or an order.</p>` +
    '</td></tr>' +
    '</table>' +
    '<!--[if mso]></td></tr></table><![endif]-->' +
    '</td></tr></table>' +
    '</body></html>'
  );
}
