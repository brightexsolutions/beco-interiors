import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { sendOrderReceipt } from '@/app/(app)/orders/actions';
import { OrderDocumentPanel } from '../order-document-panel';

vi.mock('@/app/(app)/orders/actions', () => ({
  sendOrderReceipt: vi.fn(async () => ({ ok: 'Sent to a@example.com.' })),
  markReceiptSharedWhatsApp: vi.fn(async () => ({ ok: 'Recorded as sent on WhatsApp.' })),
}));

const props = {
  orderId: 'o1',
  updatedAt: 't',
  reference: 'BEC-O-00042',
  customerEmail: 'a@example.com',
  customerPhone: '0722333730',
  canMutate: true,
  paid: true,
};

describe('OrderDocumentPanel', () => {
  beforeEach(() => {
    vi.mocked(sendOrderReceipt).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
  });

  it('holds the receipt until the order is paid', () => {
    const { container } = render(<OrderDocumentPanel {...props} paid={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'View receipt' })).toBeNull();
  });

  it('View receipt opens the PDF, with Email and a real Download link', async () => {
    const user = userEvent.setup();
    render(<OrderDocumentPanel {...props} />);
    const view = screen.getByRole('button', { name: 'View receipt' });
    await user.click(view);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('BEC-O-00042');
    expect(await screen.findByRole('img', { name: 'BEC-O-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    expect(screen.queryByTitle('BEC-O-00042 PDF')).toBeNull();
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email to/i)).toHaveValue('a@example.com');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/orders/BEC-O-00042/pdf?download=1',
    );
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument();
  });

  it('lets you type an address when the order has none', async () => {
    const user = userEvent.setup();
    render(<OrderDocumentPanel {...props} customerEmail={null} />);
    await user.click(screen.getByRole('button', { name: 'View receipt' }));
    expect(screen.getByLabelText(/email to/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument();
  });

  it('hides Email when the viewer cannot mutate, and still offers Download', async () => {
    const user = userEvent.setup();
    render(<OrderDocumentPanel {...props} canMutate={false} />);
    await user.click(screen.getByRole('button', { name: 'View receipt' }));
    expect(screen.queryByRole('button', { name: 'Email' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();
  });

  it('is axe clean while unpaid', async () => {
    const { container } = render(<OrderDocumentPanel {...props} paid={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
