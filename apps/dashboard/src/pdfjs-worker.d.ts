/**
 * pdfjs-dist ships this worker build as a plain .mjs file with no
 * accompanying declaration, and its package.json has no `exports` map
 * restricting the subpath, so plain module resolution finds the file but
 * TypeScript has nothing to type it with. This is the fix pdfjs-dist's own
 * issue tracker recommends for consumers that import the worker directly.
 */
declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
