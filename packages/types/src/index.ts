export * from './enums';
export type { Database, Json } from './database';

/** A product image. Carries its role, never a flat list. See docs/SCHEMA.md. */
export interface ProductImage {
  role: import('./enums').ImageRole;
  path: string;
  alt: string;
  width: number;
  height: number;
  blur?: string;
  sort: number;
  /** Residential or commercial, for an 'application' shot only. See
      ProjectType: absent until Beco classifies the real photos. */
  project_type?: import('./enums').ProjectType;
}

export interface Spec {
  label: string;
  value: string;
}

/**
 * One size a product comes in, D137: "128mm" on a handle, "2.4m" on a
 * profile. A null price takes the product's own. Stored in `products.sizes`
 * in the order the editor lists them.
 */
export interface ProductSize {
  label: string;
  price: number | null;
  sku: string | null;
}
