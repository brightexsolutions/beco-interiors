import Link from 'next/link';
import { cn, fabClasses } from '@beco/ui';

/**
 * The 12-tap budget starts here. Fixed, under the thumb, always a real link.
 * On a phone the bottom bar carries New quote in its middle (D111), so the
 * pill shows from `lg` up only, where there is no bar.
 */
export function NewQuoteFab() {
  return (
    <Link href="/quotes/new" className={cn(fabClasses(), 'hidden lg:inline-flex')}>
      New quote
    </Link>
  );
}
