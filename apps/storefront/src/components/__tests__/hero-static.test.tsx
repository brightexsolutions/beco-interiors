import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HeroStatic } from '../hero-static';

describe('HeroStatic', () => {
  it('renders the eyebrow and the h1', () => {
    render(<HeroStatic />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'The room starts with the surface.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Beco Interiors, Nairobi')).toBeInTheDocument();
  });

  it('carries the same two calls to action as the real hero, to the same routes', () => {
    render(<HeroStatic />);
    expect(screen.getByRole('link', { name: 'View products' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Plan a visit' })).toHaveAttribute('href', '/contact');
  });

  it('is one labelled region so the page still has a hero landmark', () => {
    render(<HeroStatic />);
    expect(screen.getByRole('region', { name: 'Beco Interiors' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HeroStatic />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
