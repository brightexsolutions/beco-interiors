import Link from 'next/link';
import { cn, fabClasses, Icon } from '@beco/ui';

export function NewAnnouncementFab() {
  return (
    <Link href="/announcements?new=1" className={cn(fabClasses(), 'gap-2')}>
      <Icon name="plus" />
      New announcement
    </Link>
  );
}
