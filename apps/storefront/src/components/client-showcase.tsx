import Image from 'next/image';
import type { PublishedClient } from '@/lib/clients';

/**
 * Named, permitted clients, credentialing the finished work in the gallery
 * above it: real jobs handed over to real businesses, not just material shot
 * in a room.
 *
 * Gated on real published rows existing at all, the same principle as D27's
 * category index: this never ships an empty "trusted by" strip. Every row
 * needs BOTH `is_published` and `has_permission`, which RLS already enforces,
 * so an empty array here means either nobody, or nobody with permission, has
 * been added yet. See docs/milestones/M4-HANDOVER.md, "Client names for the
 * projects page": none are published as of M4.
 */
export function ClientShowcase({ clients }: { clients: PublishedClient[] }) {
  if (clients.length === 0) return null;

  return (
    <section aria-labelledby="client-showcase-heading" className="mt-20 border-t border-neutral-200 pt-12">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Delivered for
        </p>
      </div>
      <h2
        id="client-showcase-heading"
        className="mt-4 max-w-[24ch] font-display text-3xl leading-[1.12] text-charcoal sm:text-4xl"
      >
        Named projects, with permission.
      </h2>

      <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <li key={client.id} className="border-t border-neutral-200 pt-6">
            {client.logo ? (
              <Image
                src={client.logo.path}
                alt={client.logo.alt}
                width={client.logo.width}
                height={client.logo.height}
                className="h-10 w-auto object-contain object-left"
              />
            ) : (
              <p className="font-display text-xl text-charcoal">{client.name}</p>
            )}
            {client.sector ? (
              <p className="mt-3 font-ui text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {client.sector}
              </p>
            ) : null}
            {client.project ? (
              <p className="mt-2 max-w-[42ch] text-sm text-neutral-700">{client.project}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
