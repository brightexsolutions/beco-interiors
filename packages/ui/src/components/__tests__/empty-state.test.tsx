import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { EmptyState } from '../states';

describe('EmptyState', () => {
  it('states the fact and what to do next', () => {
    render(
      <EmptyState
        title="No quotes here"
        description="Nothing matches this filter yet. Try Everyone or clear the search."
      />,
    );
    expect(screen.getByRole('heading', { name: 'No quotes here' })).toBeInTheDocument();
    expect(screen.getByText(/try everyone/i)).toBeInTheDocument();
  });

  it('fills its parent when asked, so a dashboard queue does not collapse', () => {
    const { container } = render(<EmptyState fill title="No quotes here" />);
    expect(container.firstElementChild?.className).toContain('h-full');
  });

  it('renders an action when given, and the action is a real control', () => {
    render(<EmptyState title="No quotes here" action={<a href="/quotes/new">New quote</a>} />);
    expect(screen.getByRole('link', { name: 'New quote' })).toHaveAttribute('href', '/quotes/new');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <EmptyState title="No quotes here" description="Nothing matches this filter yet." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
