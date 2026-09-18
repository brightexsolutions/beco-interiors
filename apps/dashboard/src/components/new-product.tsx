import Link from 'next/link';
import { buttonClasses, fabClasses } from '@beco/ui';

export function NewProductButton() {
  return (
    <Link href="/products?new=1" className={`${buttonClasses({ variant: 'primary' })} hidden lg:inline-flex`}>
      New product
    </Link>
  );
}

export function NewProductFab() {
  return (
    <Link href="/products?new=1" className={`${fabClasses()} lg:hidden`}>
      New product
    </Link>
  );
}
