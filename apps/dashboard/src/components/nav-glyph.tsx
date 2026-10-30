import { cn } from '@beco/ui';

/**
 * One stroke glyph per section, shared by the phone bar and the desktop
 * sidebar (D142) so a section looks the same wherever it is listed. Never
 * the only clue: every glyph sits beside the section's word.
 */
export const NAV_GLYPHS: Record<string, string> = {
  '/': 'M3 11.5 12 4l9 7.5M5.5 10v9h13v-9',
  '/quotes': 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 16h5',
  '/orders': 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  '/customers': 'M4 5h16v14H4zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 17a3.5 3.5 0 0 1 7 0M14.5 9.5h3.5M14.5 13h3.5',
  '/products': 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  '/products/import': 'M12 4v11m0 0 4-4m-4 4-4-4M5 19h14',
  '/announcements': 'M4 10v4h3l6 4V6l-6 4zM16 9.5a3.5 3.5 0 0 1 0 5',
  '/popups': 'M4 6h16v12H4zM8 10h8M8 14h5M17 3v3',
  '/reports': 'M5 19V11M10 19V5M15 19v-7M20 19V9',
  '/users': 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0 0-6M21.5 20a5 5 0 0 0-5-5',
  '/settings': 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  '/studio/blog': 'M5 19h14M7 15l9.5-9.5a1.5 1.5 0 0 1 2 2L9 17l-3 1z',
  '/audit': 'M6 4h12v16H6zM9 9h6M9 13h6M9 17h3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

export function NavGlyph({ href, className }: { href: string; className?: string | undefined }) {
  const d = NAV_GLYPHS[href] ?? NAV_GLYPHS.more!;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('h-6 w-6 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={href === 'more' ? 2.6 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
