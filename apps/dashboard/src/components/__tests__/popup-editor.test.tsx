import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { PopupStone, StaffPopup } from '@/lib/popups';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const createPopup = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Pop up saved.' }));
const updatePopup = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Pop up saved.' }));
vi.mock('@/app/(app)/popups/actions', () => ({
  createPopup: (...a: [unknown, FormData]) => createPopup(...a),
  updatePopup: (...a: [unknown, FormData]) => updatePopup(...a),
}));

const { PopupEditor } = await import('../popup-editor');

afterEach(() => {
  createPopup.mockClear();
  updatePopup.mockClear();
});

const stones: PopupStone[] = Array.from({ length: 8 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  name: ['Anakin', 'Bianco Fendi', 'Calacatta Gold', 'Statuario', 'Beverly Gold', 'Amber Jade', 'Ink White', 'Prada Green'][i]!,
  slabPath: `stone-${i}/slab-0`,
  roomPath: `stone-${i}/application-0`,
}));

const preview = () => screen.getByTestId('popup-preview');

describe('PopupEditor', () => {
  it('previews the headline and badge as they are typed', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    await user.type(screen.getByLabelText('Headline'), '40% off selected stone');
    await user.type(screen.getByLabelText(/^Badge/), '40% off');
    expect(within(preview()).getByText('40% off selected stone')).toBeInTheDocument();
    expect(within(preview()).getByText('40% off')).toBeInTheDocument();
  });

  it('switches the preview between the two looks', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    expect(preview().querySelector('[data-variant]')).toHaveAttribute('data-variant', 'offer');
    await user.click(screen.getByRole('radio', { name: /Photo beside copy/ }));
    expect(preview().querySelector('[data-variant]')).toHaveAttribute('data-variant', 'split');
  });

  it('sends the stones in the order picked, and shows them in the preview', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    await user.type(screen.getByLabelText('Headline'), 'Offer');
    await user.click(screen.getByRole('checkbox', { name: /Statuario/ }));
    await user.click(screen.getByRole('checkbox', { name: /Anakin/ }));
    expect(within(preview()).getAllByRole('img').map((i) => i.getAttribute('alt'))).toEqual(['Statuario', 'Anakin']);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const form = createPopup.mock.calls[0]![1];
    expect(form.getAll('productIds')).toEqual([stones[3]!.id, stones[0]!.id]);
    expect(form.get('variant')).toBe('offer');
  });

  it('stops at six stones, and says how many are picked', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    for (const stone of stones.slice(0, 6)) {
      await user.click(screen.getByRole('checkbox', { name: new RegExp(stone.name) }));
    }
    expect(screen.getByText('6 of 6 picked')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Ink White/ })).toBeDisabled();
  });

  it('finds a stone by name', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    await user.type(screen.getByLabelText('Find a stone'), 'gold');
    expect(within(screen.getByRole('list', { name: 'Stones' })).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('asks for seconds, then percent, then nothing as the trigger changes', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    expect(screen.getByLabelText('Seconds')).toHaveValue(8);
    await user.selectOptions(screen.getByLabelText('Opens'), 'scroll');
    expect(screen.getByLabelText('Percent of the page')).toHaveValue(50);
    await user.selectOptions(screen.getByLabelText('Opens'), 'exit');
    expect(screen.queryByLabelText('Seconds')).toBeNull();
    expect(screen.queryByLabelText('Percent of the page')).toBeNull();
  });

  it('asks which section for the section trigger, and sends it', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    await user.type(screen.getByLabelText('Headline'), 'At the showroom');
    await user.click(screen.getByRole('checkbox', { name: /Anakin/ }));
    await user.selectOptions(screen.getByLabelText('Opens'), 'section');
    await user.selectOptions(screen.getByLabelText(/^Section/), 'home-showroom');
    expect(screen.getByRole('option', { name: 'Any page: the footer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const form = createPopup.mock.calls[0]![1];
    expect(form.get('trigger')).toBe('section');
    expect(form.get('triggerSection')).toBe('home-showroom');
  });

  it('edits an existing pop up through update, carrying its id', async () => {
    const user = userEvent.setup();
    const popup: StaffPopup = {
      id: '11111111-1111-4111-8111-111111111111', variant: 'split', eyebrow: null, badge: null, title: 'Anakin week',
      body: null, ctaLabel: null, ctaUrl: null, productIds: [stones[0]!.id], trigger: 'scroll', triggerValue: 40, triggerSection: null,
      showAgainDays: 3, startsAt: '2026-11-01T05:00:00.000Z', endsAt: '2026-11-08T05:00:00.000Z', priority: 0, isActive: true,
    };
    render(<PopupEditor popup={popup} stones={stones} />);
    expect(screen.getByRole('radio', { name: /Photo beside copy/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const form = updatePopup.mock.calls[0]![1];
    expect(form.get('popupId')).toBe(popup.id);
    expect(form.get('triggerValue')).toBe('40');
    expect(createPopup).not.toHaveBeenCalled();
  });

  it('keeps the preview out of the tab order', () => {
    render(<PopupEditor popup={null} stones={stones} />);
    expect(preview()).toHaveAttribute('inert');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PopupEditor popup={null} stones={stones} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
