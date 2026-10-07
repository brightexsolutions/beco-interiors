import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from '../page';

/**
 * The policy must say what the system actually does (D127, D128): who holds
 * the data and where, what analytics reads and how to refuse it, how long
 * things are kept, and the reader's rights under Kenya's Data Protection Act.
 */
describe('Privacy policy', () => {
  const text = () => document.body.textContent ?? '';

  it('names the controller, describes providers without naming them or where they host', () => {
    render(<PrivacyPage />);
    expect(text()).toContain('Beco Interiors Limited');
    expect(text()).toMatch(/trusted\s+service providers/);
    expect(text()).toMatch(/outside Kenya/);
    for (const name of ['Supabase', 'Vercel', 'Resend', 'Cloudflare', 'Ireland', 'Brightex']) {
      expect(text(), name).not.toContain(name);
    }
  });

  it('no longer claims nothing leaves Beco', () => {
    render(<PrivacyPage />);
    expect(text()).not.toMatch(/not sold or passed to anyone outside Beco/);
    expect(text()).not.toMatch(/Nothing more, and nobody else/);
  });

  it('says what Google Analytics reads and links the opt-out', () => {
    render(<PrivacyPage />);
    expect(text()).toMatch(/Google Analytics/);
    expect(text()).toMatch(/IP address/);
    expect(text()).toMatch(/14 months/);
    expect(screen.getByRole('link', { name: /opt-out add-on/i })).toHaveAttribute('href', 'https://tools.google.com/dlpage/gaoptout');
  });

  it('states retention and the reader\u2019s rights, without pointing to the regulator', () => {
    render(<PrivacyPage />);
    expect(text()).toMatch(/five years/);
    expect(text()).toMatch(/Data Protection Act, 2019/);
    expect(text()).not.toMatch(/Data Protection Commissioner/);
    expect(screen.queryByRole('link', { name: /Commissioner/ })).toBeNull();
  });

  it('carries the date of this revision', () => {
    render(<PrivacyPage />);
    expect(text()).toContain('Last updated 6 October 2026');
  });
});
