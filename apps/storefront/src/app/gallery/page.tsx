import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal, buttonClasses } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { getGalleryShots, blurProps } from '@/lib/products';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Project gallery',
  description:
    'Real interiors finished with Beco materials in Nairobi. Sintered stone worktops, feature walls, vanities and flooring, photographed on site.',
  alternates: { canonical: '/gallery' },
};

/**
 * The project gallery.
 *
 * Every photograph is a real installation. That matters commercially as well
 * as ethically: the nearest competitor's equivalent rooms are AI generated, so
 * real Kenyan projects are a positioning advantage rather than a box to tick.
 *
 * Shots are interleaved across products by `getGalleryShots`, so no single
 * stone dominates the first screen. Delfone alone has ten photographs.
 *
 * The rhythm is a repeating four step grid rather than an even four across,
 * and each frame drifts at one of three depths, so a long page of rooms has
 * some structure to it instead of being a contact sheet.
 */
const SPAN = [
  'lg:col-span-7',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-7',
] as const;
const FRAME = ['aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-[16/10]'] as const;
const DEPTH = ['beco-depth-1', 'beco-depth-3', 'beco-depth-2', 'beco-depth-1'] as const;

export default async function GalleryPage() {
  const shots = await getGalleryShots();

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
      <PageHeader
        className="mb-16"
        eyebrow="Project gallery"
        title="Finished, and in use."
        aside={
          shots.length > 0 ? (
            <p className="font-ui text-sm text-neutral-500">{shots.length} photographs</p>
          ) : undefined
        }
        lede="Real interiors in Nairobi, photographed on site. A slab tells you the veining. A room tells you whether it works."
      />

      {shots.length === 0 ? (
        <p className="max-w-[52ch] text-base text-neutral-700">
          We are photographing our installations now. In the meantime the showroom has the full
          range on the floor.
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          {shots.map((shot, i) => (
            <Reveal
              key={`${shot.productSlug}-${shot.path}`}
              delay={(i % 2) * 80}
              className={SPAN[i % SPAN.length]}
            >
              <Link href={`/product/${shot.productSlug}`} className="group block">
                <div
                  className={`relative w-full overflow-hidden bg-neutral-100 ${FRAME[i % FRAME.length]} ${DEPTH[i % DEPTH.length]}`}
                >
                  <Image
                    src={shot.path}
                    alt={shot.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    {...blurProps(shot)}
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>
                <p className="mt-4 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                  {shot.productName}
                  <span
                    aria-hidden
                    className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                  />
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-20 border-t border-neutral-200 pt-12">
        <p className="max-w-[26ch] font-display text-3xl leading-[1.12] text-charcoal sm:text-4xl">
          Bring us the drawing. We will price it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
            Request a quote
          </Link>
          <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
            Visit the showroom
          </Link>
        </div>
      </div>
    </main>
  );
}
