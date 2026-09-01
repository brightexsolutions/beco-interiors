import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnnouncementDismiss } from '../announcement-dismiss';
import { DISMISS_COOKIE } from '@/lib/announcements';

/**
 * The bar is server rendered so it cannot push the page down after paint,
 * which is a direct CLS failure. That argument only holds if the dismissal is
 * remembered in a COOKIE: remembering it client side would reintroduce the
 * shift on every later visit, because the server would render the bar and the
 * browser would then remove it.
 *
 * So what is asserted here is that a cookie is written, and that it carries
 * the announcement's id.
 */
const clearCookies = () => {
  for (const c of document.cookie.split(';')) {
    document.cookie = `${c.split('=')[0]!.trim()}=; path=/; max-age=0`;
  }
};

beforeEach(clearCookies);
afterEach(clearCookies);

describe('AnnouncementDismiss', () => {
  it('writes a cookie so the SERVER knows next time, not just this tab', async () => {
    const user = userEvent.setup();
    render(<AnnouncementDismiss id="abc-123" />);
    expect(document.cookie).not.toContain(DISMISS_COOKIE);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(document.cookie).toContain(`${DISMISS_COOKIE}=abc-123`);
  });

  it('keys the cookie on the announcement id, so a NEW one reappears', async () => {
    const user = userEvent.setup();
    render(<AnnouncementDismiss id="spring-sale" />);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    // A later announcement has a different id, so this value cannot suppress
    // it. Without this the first dismissal would silence every future one.
    expect(document.cookie).toContain('spring-sale');
    expect(document.cookie).not.toContain('undefined');
  });

  it('removes itself immediately, rather than waiting for a reload', async () => {
    const user = userEvent.setup();
    render(<AnnouncementDismiss id="abc" />);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
  });

  it('is a real control with an accessible name, not a bare glyph', () => {
    render(<AnnouncementDismiss id="abc" />);
    expect(screen.getByRole('button', { name: 'Dismiss this announcement' })).toBeInTheDocument();
  });
});
