import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AnnouncementBar } from '../announcement-bar';
import type { Announcement } from '@/lib/announcements';

const announcement = (over: Partial<Announcement> = {}): Announcement => ({
  id: 'a1', title: 'Now on the floor', body: null, type: 'notice',
  cta_label: null, cta_url: null, ...over,
});

describe('AnnouncementBar', () => {
  it('renders nothing when there is no live announcement', () => {
    const { container } = render(<AnnouncementBar announcement={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('states the title, and the body only where there is room for it', () => {
    render(<AnnouncementBar announcement={announcement({ body: 'The full range is in stock.' })} />);
    expect(screen.getByText('Now on the floor')).toBeInTheDocument();
    expect(screen.getByText('The full range is in stock.')).toBeInTheDocument();
  });

  it('renders a real link when a call to action is given', () => {
    render(
      <AnnouncementBar
        announcement={announcement({ cta_label: 'Plan a visit', cta_url: '/contact' })}
      />,
    );
    expect(screen.getByRole('link', { name: 'Plan a visit' })).toHaveAttribute('href', '/contact');
  });

  it('inverts to Warm Red only for a clearance, everything else stays charcoal', () => {
    const { container: clearance } = render(
      <AnnouncementBar announcement={announcement({ type: 'clearance' })} />,
    );
    expect(clearance.firstElementChild).toHaveClass('bg-warm-red-deep');

    const { container: sale } = render(<AnnouncementBar announcement={announcement({ type: 'sale' })} />);
    expect(sale.firstElementChild).toHaveClass('bg-charcoal');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AnnouncementBar announcement={announcement({ cta_label: 'Plan a visit', cta_url: '/contact' })} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
