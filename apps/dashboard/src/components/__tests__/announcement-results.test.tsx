import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { StaffAnnouncement } from '@/lib/announcements';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/announcements',
  useSearchParams: () => params,
}));

vi.mock('@/components/announcement-editor', () => ({
  AnnouncementEditor: ({ announcement }: { announcement: StaffAnnouncement | null }) => (
    <p>{announcement ? `Editing ${announcement.title}` : 'Creating announcement'}</p>
  ),
}));

const { AnnouncementResults } = await import('../announcement-results');

const row = (over: Partial<StaffAnnouncement> = {}): StaffAnnouncement => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Mid year sale',
  body: 'Selected slabs.',
  type: 'sale',
  ctaLabel: 'Shop stone',
  ctaUrl: '/shop',
  startsAt: '2026-09-19T05:00:00.000Z',
  endsAt: '2026-09-30T15:00:00.000Z',
  priority: 2,
  isActive: true,
  createdBy: 'admin-1',
  ...over,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('AnnouncementResults', () => {
  it('gives every row an explicit Edit action', () => {
    render(<AnnouncementResults announcements={[row()]} editing={null} creating={false} />);
    expect(screen.getAllByRole('columnheader', { name: 'Actions' }).length).toBeGreaterThan(0);
    const edit = screen.getAllByRole('link', { name: /edit mid year sale/i });
    expect(edit[0]).toHaveAttribute('href', '/announcements?edit=11111111-1111-4111-8111-111111111111');
  });

  it('opens the editor sheet from ?edit=', () => {
    render(<AnnouncementResults announcements={[row()]} editing={row()} creating={false} />);
    expect(screen.getByRole('dialog', { name: 'Mid year sale' })).toBeInTheDocument();
    expect(screen.getByText('Editing Mid year sale')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AnnouncementResults announcements={[row()]} editing={null} creating={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
