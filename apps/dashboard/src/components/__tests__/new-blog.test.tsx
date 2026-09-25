import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewBlogFab } from '../new-blog';

describe('NewBlogFab', () => {
  it('goes to /studio/blog/new', () => {
    render(<NewBlogFab />);
    expect(screen.getByRole('link', { name: 'New article' })).toHaveAttribute('href', '/studio/blog/new');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewBlogFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
