import {
  Button, PriceDisplay, AvailabilityBadge, ProductCard, ProductGallery,
  EmptyState, LoadingState, ErrorState, PALETTE,
} from '@beco/ui';

/**
 * Component gallery, at /design-system.
 *
 * A real route on purpose, so it can be opened on staging and looked at,
 * rather than only existing in a developer's head. Excluded from search with
 * `noindex` and kept out of the sitemap: it is for the team, not for buyers.
 *
 * Built to be held next to prototype/beco-design-system.html and compared.
 */
export const metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
};

const Swatch = ({ name, hex, note }: { name: string; hex: string; note?: string }) => (
  <div>
    <div className="h-20 w-full border border-neutral-200" style={{ background: hex }} />
    <p className="mt-2 font-ui text-sm font-semibold text-charcoal">{name}</p>
    <p className="font-ui text-xs text-neutral-500">{hex}</p>
    {note ? <p className="mt-1 font-ui text-xs text-neutral-500">{note}</p> : null}
  </div>
);

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="border-t border-neutral-200 py-16">
    <div className="mb-8 flex items-baseline gap-4">
      <span aria-hidden className="h-px w-8 bg-warm-red" />
      <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {n}
      </p>
      <h2 className="font-display text-3xl text-charcoal">{title}</h2>
    </div>
    {children}
  </section>
);

const Stone = () => (
  <div className="h-full w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300" />
);

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16">
      <header className="pb-8">
        <div className="flex items-baseline gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Beco Interiors
          </p>
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[1.1] text-charcoal">Design system</h1>
        <p className="mt-4 max-w-[68ch] text-base text-neutral-700">
          Built from the April 2025 brand guideline, not the prototype. Three colours, no
          secondary, because the guideline calls its palette intentionally narrow as a stated
          position. The shell stays near monochrome so the stone is the only colour on the page.
        </p>
      </header>

      <Section n="01" title="Colour">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Swatch name="Warm Red" hex={PALETTE.warmRed} note="Fills, rules and badges only" />
          <Swatch name="Warm Red Deep" hex={PALETTE.warmRedDeep} note="Anything carrying white text. 5.88:1" />
          <Swatch name="Charcoal" hex={PALETTE.charcoal} note="A cool black. 40% cyan" />
          <Swatch name="High-Vis White" hex={PALETTE.highVisWhite} />
        </div>
        <p className="mt-6 max-w-[68ch] text-base text-neutral-700">
          Pure Warm Red carries white text at only 4.38:1, below the 4.5 AA floor, which the
          contrast script caught on its first run. So buttons use the deeper variant and pure
          red is reserved for fills, rules and badges. The prototype&rsquo;s gold is retired.
        </p>
      </Section>

      <Section n="02" title="Typography">
        <p className="font-display text-5xl leading-[1.1] text-charcoal">Elevate every surface.</p>
        <p className="mt-2 font-ui text-sm text-neutral-500">
          Cormorant Garamond 400, display and section headings
        </p>
        <p className="mt-8 max-w-[68ch] text-base text-charcoal">
          Titillium Web carries interface, body copy and navigation. Nothing drops below 16px
          anywhere, including the dashboard. Measure is capped at 68 characters, so a paragraph
          never spans a wide screen.
        </p>
        <p className="mt-2 font-ui text-sm text-neutral-500">
          Titillium Web 400 and 600, self hosted, 69KB for the whole type system
        </p>
      </Section>

      <Section n="03" title="Buttons">
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Request a quote</Button>
          <Button variant="secondary">Add to order</Button>
          <Button variant="outline">Browse the catalogue</Button>
          <Button variant="whatsapp">WhatsApp</Button>
          <Button variant="ghost">Call the showroom</Button>
        </div>
      </Section>

      <Section n="04" title="Price, the component that must never be ambiguous">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <PriceDisplay priceDisplayMode="poa" unit="per slab" />
            <p className="mt-2 font-ui text-xs text-neutral-500">How all 24 stones launch today</p>
          </div>
          <div>
            <PriceDisplay priceDisplayMode="fixed" price={25000} unit="per slab" />
            <p className="mt-2 font-ui text-xs text-neutral-500">Once Beco supplies prices</p>
          </div>
          <div>
            <PriceDisplay priceDisplayMode="fixed" price={22000} compareAtPrice={25000} unit="per slab" />
            <p className="mt-2 font-ui text-xs text-neutral-500">Clearance, original struck through</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <AvailabilityBadge availability="in_stock" />
          <AvailabilityBadge availability="pre_order" />
          <AvailabilityBadge availability="poa" />
        </div>
      </Section>

      <Section n="05" title="Product cards">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ProductCard name="Limestone Ivory" href="#" image={<Stone />}
            priceDisplayMode="poa" availability="poa" />
          <ProductCard name="Calcatta Gold" href="#" image={<Stone />}
            priceDisplayMode="fixed" price={25000} unit="per slab" availability="in_stock" badge="hot" />
          <ProductCard name="Precious Black" href="#" image={<Stone />}
            priceDisplayMode="fixed" price={22000} compareAtPrice={25000}
            unit="per slab" availability="in_stock" badge="sale" />
          <ProductCard name="Statuario" href="#" image={<Stone />}
            priceDisplayMode="poa" availability="pre_order" badge="new" />
        </div>
        <p className="mt-6 max-w-[68ch] text-base text-neutral-700">
          No border, no shadow, no lift. A fixed 4:5 frame that crops rather than resizes, the
          image scaling inside it on hover, and a red hairline drawing under the name. The frame
          never moves, so a grid stays completely still.
        </p>
      </Section>

      <Section n="06" title="Gallery, on three images and on six">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <ProductGallery images={[
              { role: 'slab', alt: '', node: <Stone /> },
              { role: 'application', alt: '', node: <Stone /> },
              { role: 'application', alt: '', node: <Stone /> },
            ]} />
            <p className="mt-4 font-ui text-sm text-neutral-500">
              Three, which Pure White actually has
            </p>
          </div>
          <div>
            <ProductGallery images={[
              { role: 'slab', alt: '', node: <Stone /> },
              { role: 'on_stand', alt: '', node: <Stone /> },
              { role: 'bookmatch', alt: '', node: <Stone /> },
              { role: 'application', alt: '', node: <Stone /> },
              { role: 'application', alt: '', node: <Stone /> },
              { role: 'application', alt: '', node: <Stone /> },
            ]} />
            <p className="mt-4 font-ui text-sm text-neutral-500">
              Six, which Calcatta Oro has. Same component, no holes
            </p>
          </div>
        </div>
      </Section>

      <Section n="07" title="States, including the one this project lives in">
        <EmptyState
          title="SPC Flooring is coming soon"
          description="We are photographing this range now. In the meantime our team can advise on
                       specification and pricing directly."
          action={<Button variant="primary">Request a quote</Button>}
        />
        <div className="mt-12">
          <LoadingState count={4} />
        </div>
        <div className="mt-12">
          <ErrorState
            title="We could not load the catalogue"
            description="This is on us, not you. Try again in a moment, or call the showroom."
            action={<Button variant="outline">Try again</Button>}
          />
        </div>
      </Section>
    </main>
  );
}
