import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Busy } from '../busy';
import { Spinner } from '../spinner';

describe('Busy', () => {
  it('keeps a live region in the page even while idle, so the first announcement is heard', () => {
    render(<Busy pending={false} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveClass('hidden');
  });

  it('shows the spinner and the words while pending', () => {
    render(<Busy pending label="Updating" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Updating');
    expect(status.querySelector('svg')).not.toBeNull();
    expect(status).not.toHaveClass('hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Busy pending />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Spinner', () => {
  it('is decorative and holds still under reduced motion', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('animate-spin');
    expect(svg).toHaveClass('motion-reduce:animate-none');
  });
});
