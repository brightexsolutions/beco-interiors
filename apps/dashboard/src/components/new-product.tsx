import Link from 'next/link';
import { cn, fabClasses, Icon } from '@beco/ui';

/** Charcoal FAB on desktop and on a phone, same as New quote. Never a heading button. */
export function NewProductFab() {
  return (
    <Link href="/products?new=1" className={cn(fabClasses(), 'gap-2')}>
      <Icon name="plus" />
      New product
    </Link>
  );
}
