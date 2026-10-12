import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { GUIDE_TOPICS } from '@/lib/guide';

let pathname = '/products';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const { GuideButton, orderForPath } = await import('../guide');

const topics = GUIDE_TOPICS.filter((topic) => ['overview', 'quotes', 'new-quote', 'products', 'photos'].includes(topic.id));

describe('GuideButton', () => {
  it('opens the guide on the current screen, marked Here, and walks its steps in order', async () => {
    const user = userEvent.setup();
    render(<GuideButton topics={topics} />);
    await user.click(screen.getByRole('button', { name: 'Guide' }));
    const dialog = screen.getByRole('dialog', { name: 'Guide' });
    const nav = within(dialog).getByRole('navigation', { name: 'Guide topics' });
    const first = within(nav).getAllByRole('button')[0]!;
    expect(first).toHaveTextContent('Catalogue');
    expect(first).toHaveTextContent('Here');
    expect(first).toHaveAttribute('aria-current', 'true');
    expect(within(dialog).getByRole('heading', { name: 'Catalogue' })).toBeInTheDocument();
    const steps = within(dialog).getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(steps.length).toBe(topics.find((topic) => topic.id === 'products')!.steps.length);
    expect(steps[0]).toHaveTextContent('Browse by range.');
  });

  it('switches topic from the list', async () => {
    const user = userEvent.setup();
    render(<GuideButton topics={topics} />);
    await user.click(screen.getByRole('button', { name: 'Guide' }));
    const dialog = screen.getByRole('dialog', { name: 'Guide' });
    await user.click(within(dialog).getByRole('button', { name: /Product photographs/ }));
    expect(within(dialog).getByRole('heading', { name: 'Product photographs' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Most Compatible/)).toBeInTheDocument();
  });

  it('is icon only when compact, still named for a screen reader, and draws nothing with no topics', () => {
    const { rerender } = render(<GuideButton topics={topics} compact />);
    const button = screen.getByRole('button', { name: 'Guide' });
    expect(button.textContent).toBe('');
    rerender(<GuideButton topics={[]} />);
    expect(screen.queryByRole('button', { name: 'Guide' })).toBeNull();
  });

  it('has no accessibility violations, closed and open', async () => {
    const user = userEvent.setup();
    const { container } = render(<GuideButton topics={topics} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Guide' }));
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('orderForPath', () => {
  it('puts the longest matching topic first and keeps the rest in order', () => {
    expect(orderForPath(topics, '/quotes/new').map((topic) => topic.id)).toEqual(['new-quote', 'overview', 'quotes', 'products', 'photos']);
    expect(orderForPath(topics, '/settings').map((topic) => topic.id)).toEqual(['overview', 'quotes', 'new-quote', 'products', 'photos']);
  });
});
