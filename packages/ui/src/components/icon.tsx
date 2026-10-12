import { cn } from '../lib/cn';

/**
 * Stroke icons for labelled dashboard actions. Never the only clue: a
 * button still says Edit, View, or New product. No lucide, no phosphor.
 */
export type IconName =
  | 'plus'
  | 'minus'
  | 'pencil'
  | 'arrow-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'upload'
  | 'photo'
  | 'x'
  | 'trash'
  | 'sparkles'
  | 'bold'
  | 'italic'
  | 'heading'
  | 'list'
  | 'link'
  | 'sun'
  | 'moon'
  | 'info'
  | 'grid'
  | 'rows'
  | 'eye'
  | 'columns'
  | 'help'
  | 'check'
  | 'offline'
  | 'search';

const PATH: Record<IconName, string> = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  photo: 'M4 7h3l2-2h6l2 2h3v12H4Z M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12',
  sparkles:
    'M12 3l1.15 3.5L17 8l-3.85 1.5L12 13l-1.15-3.5L7 8l3.85-1.5Z M18.5 13l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z',
  bold: 'M6 5h8a3.5 3.5 0 0 1 0 7H6Zm0 7h9a3.5 3.5 0 0 1 0 7H6V5',
  italic: 'M15 5H9M13 19H7M14.5 5l-5 14',
  heading: 'M6 5v14M18 5v14M6 12h12',
  list: 'M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01',
  link: 'M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 6M14 11a5 5 0 0 0-7.07 0L5.5 12.43a5 5 0 0 0 7.07 7.07L14 18',
  sun: 'M12 4V2M12 22v-2M4.93 4.93 3.51 3.51M20.49 20.49l-1.42-1.42M4 12H2M22 12h-2M4.93 19.07l-1.42 1.42M20.49 3.51l-1.42 1.42M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z',
  grid: 'M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z',
  rows: 'M4 6h16M4 12h16M4 18h16',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  columns: 'M4 4h4v16H4ZM10 4h4v11h-4ZM16 4h4v7h-4Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7 M12 17h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  offline: 'M3 3l18 18M8.5 8.7A9 9 0 0 0 5 11.5M2 8.5a13 13 0 0 1 4.3-2.9M12 5a13 13 0 0 1 10 3.5M8.5 15a5 5 0 0 1 7 0M12 19h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
};

export function Icon({ name, className }: { name: IconName; className?: string | undefined }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('h-4 w-4 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATH[name]} />
    </svg>
  );
}
