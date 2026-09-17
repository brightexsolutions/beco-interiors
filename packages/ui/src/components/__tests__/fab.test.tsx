import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Fab, fabClasses } from '../fab';

describe('Fab', () => {
  it('renders its label, so a round icon is not the only clue', () => {
    render(<Fab>New quote</Fab>);
    expect(screen.getByRole('button', { name: 'New quote' })).toBeInTheDocument();
  });

  it('is fixed to the corner, which is what makes it a floating action', () => {
    render(<Fab>New quote</Fab>);
    expect(screen.getByRole('button').className).toContain('fixed');
    expect(screen.getByRole('button').className).toContain('bottom-');
  });

  it('meets the 44px floor, and then some, because a thumb has to hit it while scrolling', () => {
    render(<Fab>New quote</Fab>);
    expect(screen.getByRole('button').className).toContain('min-h-14');
  });

  it('exports the same classes for a real link, so the quotes FAB can be an <a>', () => {
    render(
      <a href="/quotes/new" className={fabClasses()}>
        New quote
      </a>,
    );
    expect(screen.getByRole('link', { name: 'New quote' })).toHaveAttribute('href', '/quotes/new');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Fab>New quote</Fab>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
