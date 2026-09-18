import Link from 'next/link';
import { cn, fabClasses, Icon } from '@beco/ui';

export function NewUserFab() {
  return (
    <Link href="/users?new=1" className={cn(fabClasses(), 'gap-2')}>
      <Icon name="plus" />
      New user
    </Link>
  );
}
