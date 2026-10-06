import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { toast } from '@beco/ui';
import { WhatsAppShare, filenameFrom } from '../whatsapp-share';

const pdfResponse = () =>
  new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
    status: 200,
    headers: {
      'Content-Disposition': 'attachment; filename="BEC-Q-00042 Achieng.pdf"',
      'X-Document-Path': 'quotes/BEC-Q-00042/3f2504e0-4f89-41d3-9a0c-0305e82c3301.pdf',
    },
  });

const setup = (over: Partial<React.ComponentProps<typeof WhatsAppShare>> = {}) => {
  const onShared = vi.fn(async () => ({ ok: 'Recorded' }));
  render(
    <WhatsAppShare
      downloadHref="/quotes/BEC-Q-00042/pdf?download=1"
      fallbackFilename="BEC-Q-00042.pdf"
      chatHref="https://wa.me/254722333730?text=Beco%20quote%20BEC-Q-00042"
      message="Beco quote BEC-Q-00042"
      onShared={onShared}
      {...over}
    />,
  );
  return { onShared };
};

describe('filenameFrom', () => {
  it('reads the name from Content-Disposition, or falls back', () => {
    expect(filenameFrom('attachment; filename="BEC-Q-1 A B.pdf"', 'x.pdf')).toBe('BEC-Q-1 A B.pdf');
    expect(filenameFrom(null, 'x.pdf')).toBe('x.pdf');
  });
});

describe('WhatsAppShare', () => {
  const original = { share: navigator.share, canShare: navigator.canShare };
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => pdfResponse()));
    vi.spyOn(window, 'open').mockImplementation(() => null);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.assign(navigator, original);
  });

  it('shares the PDF file itself on a phone, then records the send', async () => {
    const share = vi.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    const user = userEvent.setup();
    const { onShared } = setup();
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const payload = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(payload.files?.[0]?.name).toBe('BEC-Q-00042 Achieng.pdf');
    expect(payload.text).toBe('Beco quote BEC-Q-00042');
    expect(onShared).toHaveBeenCalledWith('quotes/BEC-Q-00042/3f2504e0-4f89-41d3-9a0c-0305e82c3301.pdf');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('on a desktop, saves the PDF and opens the prefilled chat', async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined });
    const success = vi.spyOn(toast, 'success').mockImplementation(() => '' as never);
    const user = userEvent.setup();
    const { onShared } = setup();
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith(
      'https://wa.me/254722333730?text=Beco%20quote%20BEC-Q-00042',
      '_blank',
      'noopener,noreferrer',
    ));
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/attach it/i));
    expect(onShared).toHaveBeenCalled();
  });

  it('records nothing when the salesperson cancels the share sheet', async () => {
    Object.assign(navigator, {
      share: vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError');
      }),
      canShare: () => true,
    });
    const user = userEvent.setup();
    const { onShared } = setup();
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).toBeEnabled());
    expect(onShared).not.toHaveBeenCalled();
  });

  it('stops before generating when the lines could not be saved', async () => {
    const user = userEvent.setup();
    setup({ beforeShare: async () => false });
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).toBeEnabled());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says why when the PDF cannot be prepared, and records nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Could not store the PDF', { status: 500 })));
    const error = vi.spyOn(toast, 'error').mockImplementation(() => '' as never);
    const user = userEvent.setup();
    const { onShared } = setup();
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Could not store the PDF'));
    expect(onShared).not.toHaveBeenCalled();
  });

  it('is axe clean', async () => {
    const { container } = render(
      <WhatsAppShare downloadHref="/x" fallbackFilename="x.pdf" chatHref="https://wa.me/1" message="m" onShared={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
