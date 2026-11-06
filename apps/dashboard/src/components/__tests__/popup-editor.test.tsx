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
const uploadPopupBanner = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Banner uploaded.' }));
const removePopupBanner = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Banner removed.' }));
vi.mock('@/app/(app)/popups/actions', () => ({
  createPopup: (...a: [unknown, FormData]) => createPopup(...a),
  updatePopup: (...a: [unknown, FormData]) => updatePopup(...a),
  uploadPopupBanner: (...a: [unknown, FormData]) => uploadPopupBanner(...a),
  removePopupBanner: (...a: [unknown, FormData]) => removePopupBanner(...a),
}));

// The direct upload path has its own tests; here the banner form's data is
// handed straight to the action, which is what proves the file input and its
// button really belong to the banner form, not the main one.
vi.mock('@/components/use-photo-upload', async () => {
  const { startTransition } = await import('react');
  return {
    usePhotoUpload: ({ dispatch }: { dispatch: (form: FormData) => void }) => ({
      onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => dispatch(form));
      },
      phase: 'idle',
      progress: 0,
      label: null,
      settle: () => {},
    }),
  };
});

const { PopupEditor } = await import('../popup-editor');

afterEach(() => {
  createPopup.mockClear();
  updatePopup.mockClear();
  uploadPopupBanner.mockClear();
  removePopupBanner.mockClear();
});

const bannerPopup: StaffPopup = {
  id: '44444444-4444-4444-8444-444444444444', variant: 'image', eyebrow: null, badge: null,
  title: 'End year sale: up to 40% off sintered stones', body: null, ctaLabel: 'Shop now', ctaUrl: '/shop',
  productIds: [], trigger: 'delay', triggerValue: 5, triggerSection: null, showAgainDays: 7,
  startsAt: '2026-11-05T05:00:00.000Z', endsAt: '2026-12-15T20:59:00.000Z', priority: 10, isActive: true,
  image: { path: 'popups/44444444-4444-4444-8444-444444444444/ab12cd34', width: 3780, height: 1890 },
};

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
      showAgainDays: 3, startsAt: '2026-11-01T05:00:00.000Z', endsAt: '2026-11-08T05:00:00.000Z', priority: 0, isActive: true, image: null,
    };
    render(<PopupEditor popup={popup} stones={stones} />);
    expect(screen.getByRole('radio', { name: /Photo beside copy/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const form = updatePopup.mock.calls[0]![1];
    expect(form.get('popupId')).toBe(popup.id);
    expect(form.get('triggerValue')).toBe('40');
    expect(createPopup).not.toHaveBeenCalled();
  });

  it('locks Save once a new pop up is saved, so a second press cannot make a duplicate', async () => {
    const user = userEvent.setup();
    createPopup.mockResolvedValueOnce({ ok: 'Pop up saved.', popupId: '11111111-1111-4111-8111-111111111111' } as never);
    render(<PopupEditor popup={null} stones={stones} />);
    await user.type(screen.getByLabelText('Headline'), 'Offer');
    await user.click(screen.getByRole('checkbox', { name: /Anakin/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const saved = await screen.findByRole('button', { name: 'Saved' });
    expect(saved).toBeDisabled();
    await user.click(saved);
    expect(createPopup).toHaveBeenCalledTimes(1);
  });

  it('draws the preview in the storefront palette and type, whatever the dashboard theme', () => {
    render(<PopupEditor popup={null} stones={stones} />);
    expect(preview()).toHaveClass('beco-fixed-palette', 'beco-storefront-scope');
  });

  it('keeps the preview out of the tab order', () => {
    render(<PopupEditor popup={null} stones={stones} />);
    expect(preview()).toHaveAttribute('inert');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PopupEditor popup={null} stones={stones} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a banner hides the stones and extra copy, and asks for a save before an upload', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={null} stones={stones} />);
    await user.click(screen.getByRole('radio', { name: /Banner image/ }));
    expect(screen.queryByRole('checkbox', { name: /Anakin/ })).toBeNull();
    expect(screen.queryByLabelText(/^Badge/)).toBeNull();
    expect(screen.getByLabelText(/What the banner says/)).toBeInTheDocument();
    expect(screen.getByText('Save the pop up, then add the banner.')).toBeInTheDocument();
    expect(within(preview()).getByText('No banner yet')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/What the banner says/), 'End year sale');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const form = createPopup.mock.calls[0]![1];
    expect(form.get('variant')).toBe('image');
    expect(form.getAll('productIds')).toEqual([]);
  });

  it('uploads a banner on its own form, carrying the pop up id and the file, not the main save', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={{ ...bannerPopup, image: null }} stones={stones} />);
    expect(screen.getByText('Not shown on the site until a banner is uploaded.')).toBeInTheDocument();
    const file = new File(['png'], 'WEBSITE SALE BANNER.png', { type: 'image/png' });
    const input = screen.getByLabelText('Banner image') as HTMLInputElement;
    await user.upload(input, file);
    // Owned by the banner form, so the main Save never carries the file.
    expect(input.form?.id).toBe('popup-banner-form');
    expect(input.files?.[0]?.name).toBe('WEBSITE SALE BANNER.png');
    await user.click(screen.getByRole('button', { name: 'Upload banner' }));
    expect(uploadPopupBanner).toHaveBeenCalledOnce();
    const form = uploadPopupBanner.mock.calls[0]![1];
    expect(form.get('popupId')).toBe(bannerPopup.id);
    // jsdom drops a file's bytes from FormData when its input joins by the
    // form attribute; that it is in the set at all proves the join.
    expect(form.has('file')).toBe(true);
    expect(form.get('title')).toBeNull();
    expect(updatePopup).not.toHaveBeenCalled();
  });

  it('previews the uploaded banner, named by what it says', () => {
    render(<PopupEditor popup={bannerPopup} stones={stones} />);
    const img = within(preview()).getByRole('img');
    expect(img.getAttribute('src')).toMatch(/popups\/4{8}-4{4}-4{4}-8444-4{12}\/ab12cd34-1600\.webp$/);
    expect(img).toHaveAttribute('alt', bannerPopup.title);
  });

  it('removes a banner only through a named confirmation', async () => {
    const user = userEvent.setup();
    render(<PopupEditor popup={bannerPopup} stones={stones} />);
    await user.click(screen.getByRole('button', { name: 'Remove banner' }));
    const dialog = await screen.findByRole('alertdialog').catch(() => screen.getByRole('dialog'));
    expect(dialog).toHaveTextContent(`Remove the banner on ${bannerPopup.title}?`);
    expect(removePopupBanner).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Remove banner' }));
    expect(removePopupBanner).toHaveBeenCalledOnce();
    expect(removePopupBanner.mock.calls[0]![1].get('popupId')).toBe(bannerPopup.id);
  });
});
