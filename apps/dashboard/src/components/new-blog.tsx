import Link from 'next/link';
import { cn, fabClasses, Icon } from '@beco/ui';

export function NewBlogFab() {
  return (
    <Link href="/studio/blog/new" className={cn(fabClasses(), 'gap-2')}>
      <Icon name="plus" />
      New article
    </Link>
  );
}
