import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Skeleton, SkeletonScreen } from '../skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology, because the blocks are noise', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes its size from the call site, so it can match what is coming', () => {
    const { container } = render(<Skeleton className="h-10 w-1/2" />);
    expect(container.firstElementChild?.className).toContain('h-10');
    expect(container.firstElementChild?.className).toContain('w-1/2');
  });

  it('drops the pulse under prefers-reduced-motion', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).toContain('motion-reduce:animate-none');
  });
});

describe('SkeletonScreen', () => {
  it('announces once, naming what is loading', () => {
    render(
      <SkeletonScreen label="Loading quotes">
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
      </SkeletonScreen>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAccessibleName('Loading quotes');
  });

  it('has exactly one live region however many blocks it holds', () => {
    render(
      <SkeletonScreen label="Loading quotes">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </SkeletonScreen>,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SkeletonScreen label="Loading quotes">
        <Skeleton className="h-4" />
      </SkeletonScreen>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
