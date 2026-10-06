import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';

/**
 * A quote, order or product reference that does not exist, or no longer
 * does. Rendered inside the shell so the nav is still one tap away.
 */
export default function DashboardNotFound() {
  return (
    <EmptyState
      title="Nothing here"
      description="That reference does not exist, or it was removed. Check the link, or find it from the list."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/quotes" className={buttonClasses({ variant: 'primary' })}>
            Quotes
          </Link>
          <Link href="/" className={buttonClasses({ variant: 'outline' })}>
            Home
          </Link>
        </div>
      }
    />
  );
}
