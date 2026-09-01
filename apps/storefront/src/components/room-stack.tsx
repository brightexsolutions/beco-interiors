import Image from 'next/image';
import { blurProps, type CatalogueProduct } from '@/lib/products';
import type { ProductImage } from '@beco/types';

/**
 * A stack of real installations that deals itself.
 *
 * The front card swipes away and returns to the back, so the deck cycles
 * without a control to press and without anyone having to notice it. It sits
 * opposite the process list, which was a column of type against an empty half
 * of the page.
 *
 * Every card also carries a STATIC stacked transform of its own, so before the
 * animation runs, and for anyone who has asked for reduced motion, it is a
 * tidy stack rather than four photographs piled exactly on top of each other.
 *
 * These are Beco's own installations. That is the whole point of showing them:
 * the competitor's equivalent rooms are generated, and real projects in
 * Nairobi are the more valuable asset.
 */
type Card = { image: ProductImage; name: string; slug: string };

export function RoomStack({ products }: { products: CatalogueProduct[] }) {
  const cards: Card[] = [];
  for (const product of products) {
    const room = product.images?.find((i) => i.role === 'application');
    if (room) cards.push({ image: room, name: product.name, slug: product.slug });
    if (cards.length === 4) break;
  }
  if (cards.length < 2) return null;

  const CYCLE = 14;

  return (
    // Padding on the right, because the fan leans that way and the swipe
    // leaves through that edge.
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[24rem] lg:sticky lg:top-32">
      {cards.map((card, i) => (
        <figure
          key={card.slug}
          className="beco-stack-card absolute inset-0 origin-bottom overflow-hidden bg-neutral-100 shadow-[0_22px_60px_rgba(16,24,32,0.22)] will-change-transform"
          style={{
            // The static fan, matching slot `i` of the cycle exactly, so the
            // deck is a tidy hand of cards before the animation starts and
            // for anyone who has asked for reduced motion.
            transform:
              `translate3d(${i * -2.3}%, ${i * 1.1}rem, 0) rotate(${i * -3}deg) scale(${1 - i * 0.03})`,
            zIndex: 40 - i * 10,
            ['--stack-cycle' as string]: `${CYCLE}s`,
            ['--stack-delay' as string]: `-${(i * CYCLE) / cards.length}s`,
          }}
        >
          <Image
            src={card.image.path}
            alt={card.image.alt}
            fill
            sizes="(max-width: 1024px) 88vw, 26rem"
            {...blurProps(card.image)}
            className="object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-4 bg-charcoal px-6 py-4 text-high-vis-white">
            <span className="font-ui text-sm font-semibold uppercase tracking-[0.14em]">
              {card.name}
            </span>
            <span className="font-ui text-sm text-neutral-500">Installed</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
