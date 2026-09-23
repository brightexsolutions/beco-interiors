import Link from 'next/link';
import { cn, fabClasses, Icon } from '@beco/ui';

/** Charcoal FAB on desktop and on a phone, same as New product. */
export function NewCategoryFab() {
  return (
    <Link href="/categories?new=1" className={cn(fabClasses(), 'gap-2')}>
      <Icon name="plus" />
      New range
    </Link>
  );
}
