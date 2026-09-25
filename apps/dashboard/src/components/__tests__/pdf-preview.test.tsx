import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { getDocument } from 'pdfjs-dist';
import { PdfPreview } from '../pdf-preview';

describe('PdfPreview', () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
  });

  it('paints pages onto a canvas, not an iframe', async () => {
    const { container } = render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByRole('img', { name: 'BEC-Q-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/quotes/BEC-Q-00042/pdf',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
  });

  it('unmounts without throwing once the document is loaded', async () => {
    const { unmount } = render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByRole('img', { name: 'BEC-Q-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    expect(() => unmount()).not.toThrow();
  });

  it('Zoom in widens the page, and Zoom out is disabled at 100 percent', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByRole('img', { name: 'BEC-Q-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    const zoomOut = screen.getByRole('button', { name: 'Zoom out, already at 100 percent' });
    expect(zoomOut).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
  });

  it('Zoom in stops at 200 percent with a reason', async () => {
    const user = userEvent.setup();
    render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByRole('img', { name: 'BEC-Q-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    await user.click(zoomIn);
    await user.click(zoomIn);
    await user.click(zoomIn);
    await user.click(zoomIn);
    expect(screen.getByText('200%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in, already at 200 percent' })).toBeDisabled();
  });

  it('shows the HTTP error rather than a blank frame', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Could not render the PDF', { status: 500 })));
    render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByText(/could not render the pdf/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /BEC-Q-00042 PDF/ })).toBeNull();
  });

  it('shows a parse error when the file is not a PDF', async () => {
    vi.mocked(getDocument).mockReturnValueOnce({
      promise: Promise.reject(new Error('Invalid PDF structure.')),
      destroy: async () => {},
    } as ReturnType<typeof getDocument>);
    render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(await screen.findByText(/invalid pdf structure/i)).toBeInTheDocument();
  });

  it('is axe clean while loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    const { container } = render(
      <PdfPreview
        src="/quotes/BEC-Q-00042/pdf"
        title="BEC-Q-00042 PDF"
        loadingLabel="Loading quote PDF"
        fallbackError="Could not open the quote PDF."
      />,
    );
    expect(screen.getByLabelText('Loading quote PDF')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
