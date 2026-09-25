/**
 * `server-only` ships no type declarations. It is a marker package whose
 * whole job is to fail the build if a module importing it is pulled into a
 * client bundle, which is what keeps the service role key server side.
 *
 * Declaring it here keeps that guard type-checkable rather than making the
 * import an error that someone eventually deletes to make the build pass.
 */
declare module 'server-only';
