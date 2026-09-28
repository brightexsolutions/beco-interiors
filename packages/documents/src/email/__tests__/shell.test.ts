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
  steps,
} from '../shell';

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

  it('is a sharp cornered bordered box, matching the brand corner rule', () => {
    const box = referenceBox('Your reference', 'BEC-Q-00042');
    expect(box).toContain('border:1px solid');
    expect(box).not.toMatch(/border-radius\s*:\s*[1-9]/);
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
    expect(html).toContain('src="https://www.beco.co.ke/logo-mark-white.png"');
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
    expect(html).toContain('src="https://staging.beco.co.ke/logo-mark-white.png"');
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

  it('has a sharp cornered layout, no border radius anywhere', () => {
    const html = renderEmailShell({ preview: 'x', bodyHtml: contactButtons('x') + referenceBox('a', 'b') });
    expect(html).not.toMatch(/border-radius\s*:\s*[1-9]/);
  });

  it('carries the showroom hours in the footer', () => {
    expect(renderEmailShell({ preview: 'x', bodyHtml: '' })).toContain('Mon to Fri 8am to 4pm, Sat 8am to 2pm');
  });
});
