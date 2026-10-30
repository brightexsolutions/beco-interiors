import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { StaffPopup } from '@/lib/popups';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/popups',
  useSearchParams: () => params,
}));

vi.mock('@/components/popup-editor', () => ({
  PopupEditor: ({ popup }: { popup: StaffPopup | null }) => (
    <p>{popup ? `Editing ${popup.title}` : 'Creating pop up'}</p>
  ),
}));

const { PopupResults } = await import('../popup-results');

const ID = '11111111-1111-4111-8111-111111111111';
const row = (over: Partial<StaffPopup> = {}): StaffPopup => ({
  id: ID, variant: 'offer', eyebrow: 'Live offer', badge: '40% off', title: 'Anniversary offer', body: null,
  ctaLabel: 'Explore', ctaUrl: '/shop', productIds: [], trigger: 'scroll', triggerValue: 50, triggerSection: null, showAgainDays: 7,
  startsAt: '2026-11-01T05:00:00.000Z', endsAt: '2026-11-30T15:00:00.000Z', priority: 0, isActive: true,
  ...over,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('PopupResults', () => {
  it('lists the look and the trigger, with an Edit link per row', () => {
    render(<PopupResults popups={[row()]} stones={[]} editing={null} creating={false} />);
    expect(screen.getAllByText('Offer card').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/At 50% scrolled/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /edit anniversary offer/i })[0]).toHaveAttribute('href', `/popups?edit=${ID}`);
  });

  it('opens the editor sheet for a new pop up', () => {
    render(<PopupResults popups={[]} stones={[]} editing={null} creating />);
    expect(screen.getByRole('dialog', { name: 'New pop up' })).toBeInTheDocument();
    expect(screen.getByText('Creating pop up')).toBeInTheDocument();
  });

  it('shuts the sheet on Close and clears ?edit', async () => {
    const user = userEvent.setup();
    push.mockReturnValue(new Promise(() => {}));
    params = new URLSearchParams(`edit=${ID}`);
    render(<PopupResults popups={[row()]} stones={[]} editing={row()} creating={false} />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/popups');
  });

  it('says so when there are none', () => {
    render(<PopupResults popups={[]} stones={[]} editing={null} creating={false} />);
    expect(screen.getByText('No pop ups yet')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PopupResults popups={[row()]} stones={[]} editing={null} creating={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
