import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The prototype shipped Instagram and Facebook buttons as `href="#"`, and one
 * carried the label "profile coming soon". That is a control that advertises
 * an operation and does not perform it, which rule 3 forbids outright.
 *
 * So the contract is: a profile with no URL is DRAWN but is not a link. The
 * row looks complete while Beco confirms the handles, and there is still
 * nothing on the page that looks clickable and is not.
 */
const load = async (social: { name: string; url: string | null }[]) => {
  vi.resetModules();
  vi.doMock('@/lib/site', () => ({ SOCIAL: social, SITE: {} }));
  return (await import('../social-links')).SocialLinks;
};

beforeEach(() => vi.resetModules());
afterEach(() => vi.doUnmock('@/lib/site'));

describe('SocialLinks', () => {
  it('draws a placeholder for a profile with no URL, so the row looks complete', async () => {
    const SocialLinks = await load([{ name: 'Instagram', url: null }]);
    render(<SocialLinks />);
    expect(screen.getByLabelText('Instagram, profile coming soon')).toBeInTheDocument();
  });

  it('makes that placeholder unclickable rather than a link to nowhere', async () => {
    const SocialLinks = await load([
      { name: 'Instagram', url: null },
      { name: 'Facebook', url: null },
    ]);
    const { container } = render(<SocialLinks />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it('links a profile that has a real URL', async () => {
    const SocialLinks = await load([
      { name: 'Instagram', url: 'https://instagram.com/becointeriors' },
      { name: 'Facebook', url: null },
    ]);
    render(<SocialLinks />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://instagram.com/becointeriors');
  });

  it('opens a real profile externally without leaking the referrer', async () => {
    const SocialLinks = await load([
      { name: 'YouTube', url: 'https://youtube.com/@becointeriors' },
    ]);
    render(<SocialLinks />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders nothing for a profile it has no icon for', async () => {
    const SocialLinks = await load([{ name: 'Myspace', url: 'https://example.com' }]);
    const { container } = render(<SocialLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives a placeholder and a real profile the same resting appearance', async () => {
    // A row where two marks are bright and three are grey reads as broken
    // rather than as pending, which is why they match at rest and differ only
    // in whether they navigate.
    const SocialLinks = await load([
      { name: 'Instagram', url: 'https://instagram.com/becointeriors' },
      { name: 'TikTok', url: null },
    ]);
    const { container } = render(<SocialLinks />);
    const [live, placeholder] = Array.from(container.querySelectorAll('a, span'));
    expect(live!.className).toContain('border-neutral-700');
    expect(placeholder!.className).toContain('border-neutral-700');
    expect(placeholder!.className).toContain('cursor-default');
  });
});
