import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnalyticsListener } from '../analytics-listener';

/**
 * D128. The listener is the only thing that turns `data-analytics` into a
 * recorded event. Proven end to end through the real track(): the click
 * reaches GA4 and the analytics_events insert, the link's own behaviour is
 * untouched, and a broken GA4 or a refused insert changes nothing a visitor
 * can see.
 */
const fetchMock = vi.fn();

function Page({ onOuterClick }: { onOuterClick?: () => void }) {
  return (
    <div onClick={onOuterClick}>
      <AnalyticsListener />
      <a href="tel:+254722333730" data-analytics="call_click">
        <span>Call us</span>
      </a>
      <a href="https://wa.me/254722333730" data-analytics="whatsapp_click" onClick={(e) => e.stopPropagation()}>
        WhatsApp
      </a>
      <a href="/elsewhere" data-analytics="not_an_event">
        Unknown
      </a>
      <a href="/plain">Plain</a>
    </div>
  );
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  window.history.replaceState(null, '', '/product/amber-jade');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (window as { gtag?: unknown }).gtag;
  window.history.replaceState(null, '', '/');
});

const sentEvent = (call = 0) => JSON.parse(fetchMock.mock.calls[call]?.[1]?.body ?? '{}').event_type;

/**
 * Clicks and reports whether anything before the end of the bubble phase
 * cancelled the default action. It then cancels it itself, only because
 * jsdom cannot follow a tel: or external link and would log a navigation
 * error for every click. The check happens before that cancel, so it still
 * proves the listener left the link alone.
 */
function click(element: Element): { prevented: boolean } {
  const result = { prevented: true };
  const last = (event: Event) => {
    result.prevented = event.defaultPrevented;
    event.preventDefault();
  };
  window.addEventListener('click', last);
  fireEvent.click(element);
  window.removeEventListener('click', last);
  return result;
}

/** For the link that stops propagation, which a window listener never sees. */
const quietly = (element: Element) => {
  element.addEventListener('click', (event) => event.preventDefault());
  return element;
};

describe('AnalyticsListener', () => {
  it('renders nothing', () => {
    const { container } = render(<AnalyticsListener />);
    expect(container).toBeEmptyDOMElement();
  });

  it('records call_click for a click inside a tagged link, with the product it came from', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    render(<Page />);
    click(screen.getByText('Call us'));
    expect(sentEvent()).toBe('call_click');
    expect(gtag).toHaveBeenCalledWith('event', 'call_click', {
      page_path: '/product/amber-jade',
      product_slug: 'amber-jade',
    });
  });

  it('does not prevent the link from doing its job', () => {
    const outer = vi.fn();
    render(<Page onOuterClick={outer} />);
    expect(click(screen.getByText('Call us')).prevented).toBe(false);
    expect(outer).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still records a click whose handler stops propagation', () => {
    render(<Page />);
    fireEvent.click(quietly(screen.getByText('WhatsApp')));
    expect(sentEvent()).toBe('whatsapp_click');
  });

  it('ignores untagged links and names the policy would refuse', () => {
    render(<Page />);
    click(screen.getByText('Plain'));
    click(screen.getByText('Unknown'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survives gtag missing', () => {
    render(<Page />);
    expect(click(screen.getByText('Call us')).prevented).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('survives the insert being refused, and the next click still records', async () => {
    fetchMock.mockReset().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(
      new Response(null, { status: 201 }),
    );
    render(<Page />);
    expect(click(screen.getByText('Call us')).prevented).toBe(false);
    await Promise.resolve();
    fireEvent.click(quietly(screen.getByText('WhatsApp')));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentEvent(1)).toBe('whatsapp_click');
  });

  it('stops listening once unmounted', () => {
    const { unmount } = render(<Page />);
    const link = screen.getByText('Call us');
    unmount();
    document.body.appendChild(link);
    click(link);
    expect(fetchMock).not.toHaveBeenCalled();
    link.remove();
  });
});
