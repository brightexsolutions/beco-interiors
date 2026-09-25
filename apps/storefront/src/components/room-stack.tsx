import Image from 'next/image';
import { RoomStack as UIRoomStack, type RoomStackCard } from '@beco/ui';
import { blurProps, type CatalogueProduct } from '@/lib/products';

/**
 * The catalogue-aware half of the room stack: which products get a card, and
 * how each one's photograph renders.
 *
 * The deck's own mechanics, the fan, the swipe, the caption plate, moved into
 * `@beco/ui` as `RoomStack`, per rule 5: it was used on both the home page
 * and About with nothing here that actually depended on either page, only on
 * `next/image` and `CatalogueProduct`, which is exactly what kept it out of
 * the design system. This wrapper is what still knows about those two
 * things, so both call sites keep passing `products` unchanged.
 */
export function RoomStack({ products }: { products: CatalogueProduct[] }) {
  const cards: RoomStackCard[] = [];
  for (const product of products) {
    const room = product.images?.find((i) => i.role === 'application');
    if (!room) continue;
    cards.push({
      key: product.slug,
      name: product.name,
      image: (
        <Image
          src={room.path}
          alt={room.alt}
          fill
          sizes="(max-width: 1024px) 88vw, 26rem"
          {...blurProps(room)}
          className="object-cover"
        />
      ),
    });
    if (cards.length === 4) break;
  }

  return <UIRoomStack cards={cards} />;
}
