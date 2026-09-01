import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The prototype shipped Instagram and Facebook buttons as `href="#"`, and one
 * carried the label "profile coming soon". That is a control that advertises
 * an operation and does not perform it, which rule 3 forbids outright.
 *
 * So the contract is: a profile with no URL is not rendered, ever. This test
 * exists to stop someone "fixing" an empty footer by putting a placeholder
 * back in.
 */
const load = async (social: { name: string; url: string | null }[]) => {
  vi.resetModules();
  vi.doMock('@/lib/site', () => ({ SOCIAL: social, SITE: {} }));
  return (await import('../social-links')).SocialLinks;
};

beforeEach(() => vi.resetModules());
afterEach(() => vi.doUnmock('@/lib/site'));

describe('SocialLinks', () => {
  it('renders nothing at all when no profile has a URL', async () => {
    const SocialLinks = await load([
      { name: 'Instagram', url: null },
      { name: 'Facebook', url: null },
    ]);
    const { container } = render(<SocialLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('never renders a placeholder link', async () => {
    const SocialLinks = await load([{ name: 'Instagram', url: null }]);
    const { container } = render(<SocialLinks />);
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it('renders only the profiles that have a real URL', async () => {
    const SocialLinks = await load([
      { name: 'Instagram', url: 'https://instagram.com/becointeriors' },
      { name: 'Facebook', url: null },
    ]);
    render(<SocialLinks />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByLabelText('Beco Interiors on Instagram')).toHaveAttribute(
      'href',
      'https://instagram.com/becointeriors',
    );
  });

  it('opens externally without leaking the referrer', async () => {
    const SocialLinks = await load([
      { name: 'LinkedIn', url: 'https://linkedin.com/company/beco' },
    ]);
    const link = screen.getByRole ? render(<SocialLinks />).container.querySelector('a')! : null;
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
