import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const createAnnouncement = vi.fn(async () => ({
  ok: 'Announcement saved.',
  announcementId: '11111111-1111-4111-8111-111111111111',
}));
vi.mock('@/app/(app)/announcements/actions', () => ({
  createAnnouncement: (...a: Parameters<typeof createAnnouncement>) => createAnnouncement(...a),
  updateAnnouncement: vi.fn(async () => ({ ok: 'Announcement saved.' })),
}));

const { AnnouncementEditor } = await import('../announcement-editor');

describe('AnnouncementEditor', () => {
  it('previews the title in the bar and submits Save', async () => {
    const user = userEvent.setup();
    render(<AnnouncementEditor announcement={null} />);
    await user.type(screen.getByLabelText('Title'), 'Now on the floor');
    expect(screen.getByText('Now on the floor')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(createAnnouncement).toHaveBeenCalled();
  });

  it('groups copy, schedule, call to action and preview', () => {
    render(<AnnouncementEditor announcement={null} />);
    expect(screen.getByRole('heading', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Call to action' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AnnouncementEditor announcement={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
