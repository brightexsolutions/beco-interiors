import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnouncementPreview } from '../announcement-preview';

describe('AnnouncementPreview', () => {
  it('reads as the storefront bar, charcoal for a notice', () => {
    const { container } = render(<AnnouncementPreview title="Now on the floor" body="12mm range" type="notice" ctaLabel="Plan a visit" />);
    expect(screen.getByText('Now on the floor')).toBeInTheDocument();
    expect(screen.getByText('Plan a visit')).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).className).toContain('bg-charcoal');
  });

  it('spends Warm Red only on Clearance', () => {
    const { container } = render(<AnnouncementPreview title="Clearance" body="" type="clearance" ctaLabel="" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-warm-red-deep');
  });
});
