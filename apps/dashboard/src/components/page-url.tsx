/**
 * The address a product or range lives at on the website, made from its
 * name and never typed (Brown, 12 October): a slug nobody edits cannot drift
 * from the name, and a rename moves the page while the slug history keeps
 * every old link working (migrations 4 and 49). Shown read only with the
 * reason, per rule 3, and posted through a hidden field under the name the
 * actions already validate.
 */
export function PageUrl({
  prefix,
  slug,
  renamed,
}: {
  /** The route the slug sits under, "/product" or "/shop". */
  prefix: string;
  slug: string;
  /** True once the name differs from the saved one, so the address will move on Save. */
  renamed?: boolean | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="font-ui text-sm font-semibold text-charcoal">
        Page URL
        <span className="ml-2 font-normal text-neutral-500">Made from the name</span>
      </p>
      <p
        data-page-url
        className="mt-2 flex min-h-11 items-center rounded-control border border-dashed border-neutral-300 bg-neutral-50 px-3 font-ui text-base text-neutral-700 [overflow-wrap:anywhere]"
      >
        <span className="text-neutral-500">{prefix}/</span>
        {slug || <span className="text-neutral-500">your product name</span>}
      </p>
      <p className="mt-1.5 font-ui text-sm text-neutral-500">
        {renamed ? 'Changes with the new name on Save. Old links still work.' : 'Old links still work after a rename.'}
      </p>
      <input type="hidden" name="slug" value={slug} />
    </div>
  );
}
