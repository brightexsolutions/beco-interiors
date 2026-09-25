import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewAnnouncementFab } from '../new-announcement';

describe('NewAnnouncementFab', () => {
  it('goes to /announcements?new=1, floats on desktop and on a phone', () => {
    render(<NewAnnouncementFab />);
    const link = screen.getByRole('link', { name: 'New announcement' });
    expect(link).toHaveAttribute('href', '/announcements?new=1');
    expect(link.className).toContain('fixed');
    expect(link.className).not.toContain('lg:hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewAnnouncementFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
