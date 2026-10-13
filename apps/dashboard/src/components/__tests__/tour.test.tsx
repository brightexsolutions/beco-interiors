import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { TourStep } from '@/lib/tour';
import { Tour } from '../tour';

const steps: TourStep[] = [
  { target: 'heading', title: 'Quotes', body: 'Every quotation.' },
  { target: 'filters', title: 'Find a quote', body: 'Search by name.' },
  { target: 'results', title: 'The quotes', body: 'Open one.' },
];

let opener: HTMLButtonElement;
let added: HTMLElement[] = [];
beforeEach(() => {
  added = [];
  for (const target of ['heading', 'filters', 'results']) {
    const el = document.createElement('div');
    el.dataset.tour = target;
    el.getBoundingClientRect = () => ({ top: 100, left: 300, width: 400, height: 60, right: 700, bottom: 160, x: 300, y: 100, toJSON: () => ({}) });
    document.body.append(el);
    added.push(el);
  }
  opener = document.createElement('button');
  opener.textContent = 'Guide';
  document.body.append(opener);
  added.push(opener);
  opener.focus();
});
afterEach(() => {
  for (const el of added) el.remove();
});

const always = () => true;

describe('Tour, D149', () => {
  it('names the step, says how far through, lights the part and focuses Next', () => {
    render(<Tour steps={steps} onClose={() => undefined} shown={always} />);
    const card = screen.getByRole('dialog', { name: 'Quotes' });
    expect(card).toHaveAccessibleDescription('Every quotation.');
    expect(card).toHaveTextContent('Step 1 of 3');
    expect(document.querySelector('[data-tour-spotlight]')).toHaveStyle({ top: '94px', left: '294px', width: '412px', height: '72px' });
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('walks forward and back, and ends on Done', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Tour steps={steps} onClose={onClose} shown={always} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Find a quote' })).toHaveTextContent('Step 2 of 3');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('dialog', { name: 'Quotes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('steps with the arrow keys and ends on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Tour steps={steps} onClose={onClose} shown={always} />);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('dialog', { name: 'Find a quote' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('dialog', { name: 'Quotes' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ends on Skip tour, and opens the written guide from Full guide', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenGuide = vi.fn();
    render(<Tour steps={steps} onClose={onClose} onOpenGuide={onOpenGuide} shown={always} />);
    await user.click(screen.getByRole('button', { name: 'Full guide' }));
    expect(onOpenGuide).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab inside the card', async () => {
    const user = userEvent.setup();
    render(<Tour steps={steps} onClose={() => undefined} onOpenGuide={() => undefined} shown={always} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Skip tour' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });

  it('gives focus back to what opened it', () => {
    const { unmount } = render(<Tour steps={steps} onClose={() => undefined} shown={always} />);
    unmount();
    expect(opener).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    render(<Tour steps={steps} onClose={() => undefined} onOpenGuide={() => undefined} shown={always} />);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
