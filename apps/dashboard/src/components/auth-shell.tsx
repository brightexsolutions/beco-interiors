/**
 * The frame every pre-authentication screen sits in: sign in, and the forced
 * password change. A charcoal brand panel over Beco's own showroom footage,
 * and a white form panel. No gradient, no card shadow, no dark-sidebar
 * dashboard look, per the design-system skill.
 *
 * The video is the licensed interior clip (`GALLERY_FILM`, D69), muted and
 * looping, sat well back under a heavy charcoal wash so it reads as slow
 * texture rather than a scene and the type stays fully legible. It is
 * decorative: `prefers-reduced-motion` drops it to the still poster, and
 * nothing on the page waits for it.
 *
 * Not part of the signed-in app shell (M5 section C), which is a different
 * problem: this is only ever seen logged out.
 */
export function AuthShell({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-rows-[34svh_1fr] lg:grid-cols-[minmax(0,32rem)_1fr] lg:grid-rows-1">
      <aside className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-charcoal px-8 py-9 text-high-vis-white lg:px-14 lg:py-16">
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/video/gallery-ambient-poster.jpg"
          aria-hidden
        >
          <source src="/video/gallery-ambient.mp4" type="video/mp4" />
        </video>
        <img
          src="/video/gallery-ambient-poster.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 hidden h-full w-full object-cover motion-reduce:block"
        />
        {/* The brand wash: charcoal enough that the type stays legible over any
            frame, but light enough in the middle that the clip is clearly
            there. Heavier at the wordmark and the foot where text sits. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/55 to-charcoal/85"
        />

        <div className="flex items-center gap-3">
          <img src="/logo-mark-white.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-ui text-lg font-semibold uppercase tracking-[0.24em]">Beco</span>
        </div>

        <div className="hidden lg:block">
          <span aria-hidden className="block h-px w-10 bg-high-vis-white/40" />
          <p className="mt-6 font-display text-4xl leading-[1.1]">Operations</p>
          <p className="mt-4 max-w-[32ch] font-ui text-sm text-neutral-200">
            Quotes, orders and stock for the Urban Square showroom.
          </p>
        </div>

        <p className="hidden font-ui text-xs uppercase tracking-[0.2em] text-neutral-200 lg:block">
          Beco Interiors, Nairobi
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:items-center lg:px-16">
        <div className="w-full max-w-sm">
          {eyebrow ? (
            <p className="mb-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {eyebrow}
            </p>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
