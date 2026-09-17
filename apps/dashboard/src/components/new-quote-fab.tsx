import Link from 'next/link';
import { fabClasses } from '@beco/ui';

/** The 12-tap budget starts here. Fixed, under the thumb, always a real link. */
export function NewQuoteFab() {
  return (
    <Link href="/quotes/new" className={fabClasses()}>
      New quote
    </Link>
  );
}
