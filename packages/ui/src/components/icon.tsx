import { cn } from '../lib/cn';

/**
 * Stroke icons for labelled dashboard actions. Never the only clue: a
 * button still says Edit, View, or New product. No lucide, no phosphor.
 */
export type IconName =
  | 'plus'
  | 'pencil'
  | 'arrow-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'upload'
  | 'photo'
  | 'x'
  | 'trash';

const PATH: Record<IconName, string> = {
  plus: 'M12 5v14M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  photo: 'M4 7h3l2-2h6l2 2h3v12H4Z M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12',
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
