import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/announcements',
  useSearchParams: () => params,
}));

const { AnnouncementFilters } = await import('../announcement-filters');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('AnnouncementFilters', () => {
  it('writes type into the URL', async () => {
    const user = userEvent.setup();
    render(<AnnouncementFilters />);
    await user.selectOptions(screen.getByLabelText('Filter by type'), 'clearance');
    expect(push).toHaveBeenCalledWith('/announcements?type=clearance');
  });

  it('puts search and the two filters on one row from lg', () => {
    const { container } = render(<AnnouncementFilters />);
    expect(container.firstChild).toHaveClass('lg:flex');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AnnouncementFilters />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
