import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HeroStatic } from '../hero-static';

describe('HeroStatic', () => {
  it('renders the eyebrow, the h1 and the lede', () => {
    render(<HeroStatic />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Surfaces that outlast the room.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sintered stone, stocked in Nairobi')).toBeInTheDocument();
    expect(screen.getByText(/Large format slabs for kitchens/)).toBeInTheDocument();
  });

  it('carries the same two calls to action as the real hero, to the same routes', () => {
    render(<HeroStatic />);
    expect(screen.getByRole('link', { name: 'Request a quote' })).toHaveAttribute('href', '/quote');
    expect(screen.getByRole('link', { name: 'See the range' })).toHaveAttribute('href', '/shop');
  });

  it('is one labelled region so the page still has a hero landmark', () => {
    render(<HeroStatic />);
    expect(screen.getByRole('region', { name: 'Sintered stone' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HeroStatic />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
