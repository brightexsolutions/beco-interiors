import Link from 'next/link';
import { buttonClasses, cn, Icon } from '@beco/ui';

/**
 * The screen's one create action, as a heading button rather than a pill
 * floating over the list: on a phone the bottom bar already owns the
 * bottom of the screen, and a second floating layer covered the rows and
 * the filters under it (D112). The name is kept so the pages read the same.
 */
export function NewProductFab() {
  return (
    <Link href="/products?new=1" className={cn(buttonClasses({ variant: 'secondary' }), 'gap-2')}>
      <Icon name="plus" />
      New product
    </Link>
  );
}
