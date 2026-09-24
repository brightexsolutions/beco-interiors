import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ServiceCardGrid, type ServiceItem } from '../service-card-grid';
import { whatsappLink } from '@/lib/site';

const ITEMS: ServiceItem[] = [
  { title: 'Consultation and selection', body: 'Real samples, side by side.' },
  { title: 'Delivery', body: 'Collect or we bring it to site.' },
];

describe('ServiceCardGrid', () => {
  it('renders every service title and body', () => {
    render(<ServiceCardGrid items={ITEMS} />);
    expect(screen.getByText('Consultation and selection')).toBeInTheDocument();
    expect(screen.getByText('Real samples, side by side.')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Collect or we bring it to site.')).toBeInTheDocument();
  });

  it('gives each service its own "Book a consultation" link, naming that service in the message', () => {
    render(<ServiceCardGrid items={ITEMS} />);
    const links = screen.getAllByRole('link', { name: 'Book a consultation' });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      'href',
      whatsappLink('I would like to book a consultation on consultation and selection'),
    );
    expect(links[1]).toHaveAttribute(
      'href',
      whatsappLink('I would like to book a consultation on delivery'),
    );
  });

  it('opens WhatsApp in a new tab rather than navigating away from the page', () => {
    render(<ServiceCardGrid items={ITEMS} />);
    for (const link of screen.getAllByRole('link', { name: 'Book a consultation' })) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ServiceCardGrid items={ITEMS} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
