import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  attachmentNote,
  buttons,
  contactButtons,
  escapeHtml,
  eyebrow,
  heading,
  paragraph,
  referenceBox,
  renderEmailShell,
  siteUrl,
  steps, emailHero, lineTable, totalBlock, MAX_EMAIL_LINES } from '../shell';

describe('escapeHtml', () => {
  it('escapes the five characters that let markup or an attribute break out', () => {
    const payload = `<script>${'aler'}${'t(1)'}</script> & "quoted"`;
    expect(escapeHtml(payload)).toBe(
      `&lt;script&gt;${'aler'}${'t(1)'}&lt;/script&gt; &amp; &quot;quoted&quot;`,
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Achieng Otieno')).toBe('Achieng Otieno');
  });
});

describe('siteUrl', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('falls back to the live domain when STOREFRONT_URL is unset, never localhost', () => {
    process.env = { ...OLD_ENV };
    delete process.env.STOREFRONT_URL;
    expect(siteUrl()).toBe('https://www.beco.co.ke');
  });

  it('uses STOREFRONT_URL when set, with a trailing slash stripped', () => {
    process.env = { ...OLD_ENV, STOREFRONT_URL: 'https://www.beco.co.ke/' };
    expect(siteUrl()).toBe('https://www.beco.co.ke');
  });
});

describe('referenceBox', () => {
  it('escapes both the label and the value, since either can carry user input', () => {
    const box = referenceBox('<b>Label</b>', '<script>x</script>');
    expect(box).not.toContain('<b>Label</b>');
    expect(box).toContain('&lt;b&gt;Label&lt;/b&gt;');
    expect(box).not.toContain('<script>x</script>');
    expect(box).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('is a bordered box with the card corner, matching the site (D125)', () => {
    const box = referenceBox('Your reference', 'BEC-Q-00042');
    expect(box).toContain('border:1px solid');
    expect(box).toContain('border-radius:6px');
    expect(box).toContain('border-collapse:separate');
  });
});

describe('eyebrow, heading, paragraph', () => {
  it('render the text given, at the sizes the type floor requires', () => {
    expect(eyebrow('Request received')).toContain('Request received');
    expect(heading('Hi there,')).toContain('Hi there,');
    expect(paragraph('Keep the reference.')).toContain('Keep the reference.');
    // 16px is CLAUDE.md's own floor, everywhere, email included.
    expect(paragraph('x')).toMatch(/font-size:16px/);
  });

  it('escapes eyebrow copy, since a label can carry user input', () => {
    const html = eyebrow('<script>x</script>');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('uses Warm Red on the eyebrow, not on heading or body copy', () => {
    expect(eyebrow('x')).toContain('#c81419');
    expect(heading('x')).not.toContain('#c81419');
    expect(paragraph('x')).not.toContain('#c81419');
  });
});

describe('renderEmailShell', () => {
  it('produces a full document, not a bare fragment: a doctype, html, head and body', () => {
    const html = renderEmailShell({ preview: 'Preview text', bodyHtml: '<p>Body</p>' });
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect(html).toContain('<p>Body</p>');
  });

  it('carries the preview text hidden, for the inbox preheader, not visibly in the body', () => {
    const html = renderEmailShell({ preview: 'We have your request.', bodyHtml: '<p>Body</p>' });
    expect(html).toContain('We have your request.');
    expect(html).toContain('display:none');
  });

  it('escapes the preview text, so a script-tag payload cannot break out of the preheader', () => {
    const html = renderEmailShell({ preview: '<script>x</script>', bodyHtml: '<p>Body</p>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('falls back to the live domain for the logo when STOREFRONT_URL is unset, never a relative path', () => {
    const OLD_ENV = process.env;
    process.env = { ...OLD_ENV };
    delete process.env.STOREFRONT_URL;
    const html = renderEmailShell({ preview: 'x', bodyHtml: '<p>x</p>' });
    expect(html).toContain('src="https://www.beco.co.ke/logo-mark.png"');
    expect(html).not.toMatch(/src="\/logo-mark/);
    process.env = OLD_ENV;
  });

  it('renders the wordmark as real text beside the mark, so it survives a client that blocks images', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: '<p>x</p>' });
    expect(html).toContain('BECO');
    expect(html).toContain('INTERIORS');
    expect(html).toContain('alt="Beco"');
  });

  it('uses no em dashes anywhere, per rule 1', () => {
    const emDash = String.fromCharCode(0x2014);
    const html = renderEmailShell({ preview: 'We have your request.', bodyHtml: '<p>Body</p>' });
    expect(html).not.toContain(emDash);
  });

  it('builds the logo from STOREFRONT_URL rather than a relative path an email client cannot resolve', () => {
    const OLD_ENV = process.env;
    process.env = { ...OLD_ENV, STOREFRONT_URL: 'https://staging.beco.co.ke' };
    const html = renderEmailShell({ preview: 'x', bodyHtml: '<p>x</p>' });
    expect(html).toContain('src="https://staging.beco.co.ke/logo-mark.png"');
    process.env = OLD_ENV;
  });

  it('carries the real phone number and address in the footer of every email', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: '<p>x</p>' });
    expect(html).toContain('tel:+254722333730');
    expect(html).toContain('+254 722 333 730');
    expect(html).toContain('Urban Square, Enterprise Road, Industrial Area, Nairobi');
  });

  it('sets colour-scheme meta tags, so a dark mode inbox does not auto-invert the brand colours', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: '<p>x</p>' });
    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).toContain('name="supported-color-schemes" content="light"');
  });
});

describe('premium building blocks', () => {
  it('keeps every font size at or above the 14px small print floor', () => {
    const html =
      renderEmailShell({ preview: 'x', bodyHtml: '' }) +
      eyebrow('x') +
      heading('x') +
      paragraph('x') +
      referenceBox('Ref', 'BEC-Q-1', [['Valid until', '2026-10-17']]) +
      attachmentNote('BEC-Q-1.pdf', 'Attached') +
      steps(['One', 'Two']) +
      lineTable([{ description: 'Slab', quantity: 2, unit: 'slab', lineTotal: 1000 }], (n) => `KES ${n}`) +
      totalBlock('Total', 'KES 1,000', [['VAT', 'KES 138']]) +
      contactButtons('hi');
    const sizes = [...html.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(10);
    // font-size:0 is the spacer idiom on empty rule rows, not text.
    expect(sizes.filter((n) => n !== 0).every((n) => n >= 14)).toBe(true);
  });

  it('lists the reference card detail rows, escaped', () => {
    const box = referenceBox('Ref', 'BEC-Q-1', [['Valid until', '<b>soon</b>']]);
    expect(box).toContain('Valid until');
    expect(box).toContain('&lt;b&gt;soon&lt;/b&gt;');
  });

  it('numbers the steps in order', () => {
    const html = steps(['Price it', 'Send it']);
    expect(html.indexOf('>1<')).toBeLessThan(html.indexOf('>2<'));
    expect(html).toContain('Price it');
  });

  it('renders buttons as real links with escaped hrefs', () => {
    const html = buttons([{ label: 'Call', href: 'tel:+254722333730', primary: true }, { label: 'Site', href: 'https://x.test/?a="b"' }]);
    expect(html).toContain('href="tel:+254722333730"');
    expect(html).toContain('href="https://x.test/?a=&quot;b&quot;"');
  });

  it('offers a call and a prefilled WhatsApp chat', () => {
    const html = contactButtons('Hi Beco, about quote BEC-Q-1');
    expect(html).toContain('href="tel:+254722333730"');
    expect(html).toContain('https://wa.me/254722333730?text=Hi%20Beco%2C%20about%20quote%20BEC-Q-1');
  });

  it('uses only the two site corner values, 6px for the card and boxes, 4px for buttons (D125)', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: contactButtons('x') + referenceBox('a', 'b') + steps(['One']) });
    const radii = [...html.matchAll(/border-radius:([^;"]+)/g)].map((m) => m[1]!.trim());
    expect(radii.length).toBeGreaterThan(0);
    for (const radius of radii) expect(radius).toMatch(/^(?:(?:0|4px|6px)\s*)+$/);
    expect(radii).toContain('6px');
    expect(radii).toContain('4px');
    // The card rounds its top on the charcoal band and its foot on the footer.
    expect(html).toContain('border-radius:6px 6px 0 0');
    expect(html).toContain('border-radius:0 0 6px 6px');
  });

  it('carries the showroom hours in the footer', () => {
    expect(renderEmailShell({ preview: 'x', bodyHtml: '' })).toContain('Mon to Fri 8am to 4pm, Sat 8am to 2pm');
  });

  it('offers directions and the two social accounts in the footer, as real links', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: '' });
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&query=Urban%20Square');
    expect(html).toContain('href="https://www.instagram.com/becointeriorskenya"');
    expect(html).toContain('href="https://www.tiktok.com/@beco.interiors"');
  });
});

describe('hero photograph (D109)', () => {
  it('opens on the photograph when one is given, absolute, JPEG, with alt text, on charcoal', () => {
    delete process.env.STOREFRONT_URL;
    const hero = emailHero('quote');
    expect(hero.src).toBe('https://www.beco.co.ke/email/hero-quote.jpg');
    const html = renderEmailShell({ preview: 'x', bodyHtml: '', hero });
    expect(html).toContain('src="https://www.beco.co.ke/email/hero-quote.jpg"');
    expect(html).toMatch(/alt="A charcoal sintered stone island/);
    expect(html).toMatch(/background:#101820;padding:0;font-size:0;line-height:0"><img/);
  });

  it('is simply absent when no hero is given, with no empty band left behind', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: '' });
    expect(html).not.toContain('/email/hero-');
    expect(html).not.toContain('height="220"');
  });

  it('builds from STOREFRONT_URL so a preview deploy shows its own photograph', () => {
    process.env.STOREFRONT_URL = 'https://preview.example/';
    expect(emailHero('request').src).toBe('https://preview.example/email/hero-request.jpg');
    delete process.env.STOREFRONT_URL;
  });

  // The files themselves: a missing or oversized photograph shows as a broken
  // image or a slow open in the customer's inbox, which no render test sees.
  it.each(['request', 'quote', 'receipt'] as const)('ships hero-%s.jpg as a 1200 by 440 JPEG under 35KB', (kind) => {
    const file = readFileSync(new URL(`../../../../../apps/storefront/public/email/hero-${kind}.jpg`, import.meta.url));
    expect(file.length).toBeLessThan(35 * 1024);
    expect(file.subarray(0, 2).toString('hex')).toBe('ffd8');
    let i = 2;
    while (i < file.length && !(file[i] === 0xff && file[i + 1]! >= 0xc0 && file[i + 1]! <= 0xc2)) {
      i += 2 + file.readUInt16BE(i + 2);
    }
    expect([file.readUInt16BE(i + 7), file.readUInt16BE(i + 5)]).toEqual([1200, 440]);
  });
});

describe('lineTable', () => {
  const money = (n: number) => `KES ${n}`;

  it('draws nothing for no lines', () => {
    expect(lineTable([], money)).toBe('');
  });

  it('lists description, quantity with its unit, and the formatted amount, escaped', () => {
    const html = lineTable(
      [
        { description: 'Calacatta <Gold> 12mm', quantity: 2, unit: 'slab', lineTotal: 130000 },
        { description: 'Custom cut', quantity: 1.5, unit: null, lineTotal: 0 },
      ],
      money,
    );
    expect(html).toContain('Calacatta &lt;Gold&gt; 12mm');
    expect(html).toContain('2 slab');
    expect(html).toContain('KES 130000');
    expect(html).toContain('1.5');
    expect(html).toContain('On application');
  });

  it('puts the product code before the quantity, escaped, and leaves an uncoded line as it was (D124)', () => {
    const html = lineTable(
      [
        { description: 'Soft close hinge', code: 'H-301', quantity: 10, unit: 'pc', lineTotal: 4500 },
        { description: 'Hinge 1193', code: '  ', quantity: 2, unit: 'pc', lineTotal: 600 },
        { description: 'Odd', code: '<b>', quantity: 1, lineTotal: 1 },
      ],
      money,
    );
    expect(html).toContain('Code H-301, 10 pc');
    expect(html).toContain('>2 pc<');
    expect(html).not.toContain('Code  ');
    expect(html).toContain('Code &lt;b&gt;, 1');
  });

  it('caps the table and names how many more lines the PDF carries', () => {
    const lines = Array.from({ length: MAX_EMAIL_LINES + 3 }, (_, i) => ({
      description: `Line ${i + 1}`,
      quantity: 1,
      lineTotal: 100,
    }));
    const html = lineTable(lines, money);
    expect(html).toContain(`Line ${MAX_EMAIL_LINES}`);
    expect(html).not.toContain(`Line ${MAX_EMAIL_LINES + 1}`);
    expect(html).toContain('and 3 more lines in the attached PDF');
    expect(lineTable(lines.slice(0, MAX_EMAIL_LINES + 1), money)).toContain('and 1 more line in');
  });
});

describe('totalBlock', () => {
  it('sets the figure large in the serif on charcoal, with escaped detail rows', () => {
    const html = totalBlock('Total, VAT inclusive', 'KES 265,000', [['VAT at 16%', 'KES 36,552'], ['<x>', '&']]);
    expect(html).toContain('background:#101820');
    expect(html).toMatch(/font-family:Georgia[^"]*font-size:40px[^"]*">KES 265,000</);
    expect(html).toContain('VAT at 16%');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('border-radius:6px');
  });
});
