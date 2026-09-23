/**
 * Ambient declaration for side effect CSS imports, such as `sonner/dist/styles.css`.
 * This package is typechecked with plain tsc, not the Next.js compiler, so
 * there is no built in understanding of CSS imports the way there is in
 * `apps/dashboard` and `apps/storefront`.
 */
declare module '*.css';
