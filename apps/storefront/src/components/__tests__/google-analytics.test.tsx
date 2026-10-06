import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleAnalytics } from '../google-analytics';

/**
 * D128. GA4 loads on production with a valid Measurement ID, and nowhere
 * else. next/script is replaced with a plain element so the test sees what
 * would be injected, rather than depending on Next's client loader in jsdom.
 */
vi.mock('next/script', () => ({
  default: ({ id, src, strategy, children }: { id: string; src?: string; strategy: string; children?: string }) => (
    <script data-testid={id} data-src={src} data-strategy={strategy}>
      {children}
    </script>
  ),
}));

const PROD = { VERCEL_ENV: 'production', NEXT_PUBLIC_GA4_ID: 'G-TEST1234' };

describe('GoogleAnalytics', () => {
  it('loads gtag.js after interactive, and configures the ID, on production', () => {
    const { getByTestId } = render(<GoogleAnalytics env={PROD} />);
    const lib = getByTestId('ga4-gtag');
    expect(lib).toHaveAttribute('data-src', 'https://www.googletagmanager.com/gtag/js?id=G-TEST1234');
    expect(lib).toHaveAttribute('data-strategy', 'afterInteractive');
    const init = getByTestId('ga4-init');
    expect(init).toHaveAttribute('data-strategy', 'afterInteractive');
    expect(init.textContent).toContain("gtag('config','G-TEST1234')");
    expect(init.textContent).toContain('window.gtag=gtag');
  });

  it('renders nothing on a preview deploy', () => {
    const { container } = render(<GoogleAnalytics env={{ ...PROD, VERCEL_ENV: 'preview' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing in development', () => {
    const { container } = render(
      <GoogleAnalytics env={{ NODE_ENV: 'development', NEXT_PUBLIC_GA4_ID: 'G-TEST1234' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on production without an ID', () => {
    const { container } = render(<GoogleAnalytics env={{ VERCEL_ENV: 'production' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on production with a malformed ID, so nothing odd reaches the inline script', () => {
    const { container } = render(
      <GoogleAnalytics env={{ VERCEL_ENV: 'production', NEXT_PUBLIC_GA4_ID: "G-X');steal(1);//" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
