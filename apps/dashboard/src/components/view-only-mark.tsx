'use client';

import { usePathname } from 'next/navigation';
import { StatusPill, Tooltip } from '@beco/ui';

/**
 * Says so when the current section is open by module grant alone, D136:
 * the person can read everything on it and change nothing, and a screen
 * that looks like every other screen would otherwise let them find that out
 * from a refused save. Drawn in the shell beside the crumb, once, so no
 * page has to remember.
 */
export function ViewOnlyMark({ readOnlyPrefixes }: { readOnlyPrefixes: readonly string[] }) {
  const pathname = usePathname();
  const readOnly = readOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!readOnly) return null;
  return (
    <Tooltip
      content="This section is open to you by a grant. You can read everything here; changing records stays with the role that owns it."
      infoLabel="About view only"
    >
      <span className="inline-flex">
        <StatusPill label="View only" tone="muted" />
      </span>
    </Tooltip>
  );
}
