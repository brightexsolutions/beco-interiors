export * from './enums';
export type { Database } from './database';

/** A product image. Carries its role, never a flat list. See docs/SCHEMA.md. */
export interface ProductImage {
  role: import('./enums').ImageRole;
  path: string;
  alt: string;
  width: number;
  height: number;
  blur?: string;
  sort: number;
}

export interface Spec {
  label: string;
  value: string;
}
