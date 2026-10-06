import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CustomerContact } from '../customer-contact';

describe('CustomerContact', () => {
  it('calls, WhatsApps with the reference, and emails with a subject', () => {
    render(<CustomerContact phone="0722 333 730" email="a@example.com" reference="BEC-Q-00042" kind="quote" />);
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:0722333730');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/254722333730?text=Beco%20quote%20BEC-Q-00042',
    );
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:a@example.com?subject=Your%20Beco%20quote%2C%20BEC-Q-00042',
    );
  });

  it('leaves Email out when there is no address, and names an order as an order', () => {
    render(<CustomerContact phone="0722333730" email={null} reference="BEC-O-00007" kind="order" />);
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain('Beco%20order%20BEC-O-00007');
  });

  // jsdom cannot lay out, so the guarantee is held by the classes that make
  // overflow impossible: each label stays on one line and each button is
  // never narrower than that line, and the row wraps instead of squeezing.
  it('keeps every label inside its button: nowrap, never below its label, in a row that wraps', () => {
    render(<CustomerContact phone="0722333730" email="a@example.com" reference="BEC-Q-1" kind="quote" />);
    const row = screen.getByRole('group', { name: 'Contact the customer' });
    expect(row).toHaveClass('flex', 'flex-wrap');
    expect(row.className).not.toMatch(/grid-cols/);
    for (const name of ['Call', 'WhatsApp', 'Email']) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveClass('whitespace-nowrap', 'min-w-fit', 'flex-1', 'h-11');
      expect(link.className).not.toMatch(/\btruncate\b|overflow-hidden|min-w-0/);
    }
  });

  it('is axe clean', async () => {
    const { container } = render(<CustomerContact phone="0722333730" email={null} reference="BEC-Q-1" kind="quote" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
