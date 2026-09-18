import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhatsAppFab } from '../whatsapp-fab';

// Real timers throughout: mixing fake timers with userEvent's own pointer
// handling hung this suite outright, so the wait for the typing delay to
// clear is a real one, generously bounded past TYPING_MS in whatsapp-fab.tsx.
const PAST_TYPING_DELAY = { timeout: 2000 };

describe('WhatsAppFab', () => {
  it('opens a card rather than navigating straight to WhatsApp', async () => {
    const user = userEvent.setup();
    render(<WhatsAppFab />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' }));
    expect(screen.getByRole('dialog', { name: 'Beco Interiors' })).toBeInTheDocument();
  });

  it('opens on a typing indicator, then replaces it with the message and the CTA', async () => {
    const user = userEvent.setup();
    render(<WhatsAppFab />);
    await user.click(screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' }));

    expect(screen.queryByText(/ask about a stone/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /open whatsapp/i })).toBeNull();

    await waitFor(() => {
      expect(screen.getByText(/ask about a stone/i)).toBeInTheDocument();
    }, PAST_TYPING_DELAY);
    expect(screen.getByRole('link', { name: /open whatsapp/i })).toBeInTheDocument();
  });

  it('the card carries a real link to WhatsApp with a prefilled message', async () => {
    const user = userEvent.setup();
    render(<WhatsAppFab />);
    await user.click(screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' }));
    const link = await screen.findByRole('link', { name: /open whatsapp/i }, PAST_TYPING_DELAY);
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('?text=');
  });

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    render(<WhatsAppFab />);
    const trigger = screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes when the close button inside the card is clicked', async () => {
    const user = userEvent.setup();
    render(<WhatsAppFab />);
    await user.click(screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <WhatsAppFab />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Chat with Beco on WhatsApp' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
