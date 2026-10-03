import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewAnnouncementFab } from '../new-announcement';

describe('NewAnnouncementFab', () => {
  it('goes to /announcements?new=1 as a heading button, not a pill floating over the list (D112)', () => {
    render(<NewAnnouncementFab />);
    const link = screen.getByRole('link', { name: 'New announcement' });
    expect(link).toHaveAttribute('href', '/announcements?new=1');
    expect(link.className).not.toContain('fixed');
    expect(link.className).toContain('inline-flex');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewAnnouncementFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
