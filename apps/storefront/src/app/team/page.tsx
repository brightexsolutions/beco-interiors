import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal, buttonClasses } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { getPublicTeam, blurProps } from '@/lib/products';
import { SITE, whatsappLink } from '@/lib/site';

export const revalidate = 3600;

/**
 * The sales team.
 *
 * This page exists for FRAUD PREVENTION, which is how Beco asked for it on 31
 * August: a buyer being asked to pay a deposit should be able to check that
 * the person they are dealing with is actually from Beco. That is also why the
 * copy leads on verification rather than on how passionate everyone is.
 *
 * Directors never appear. `users.is_public` defaults to false and a check
 * constraint refuses the flag on any role but `beco_sales`, so a director
 * cannot be listed here even by mistake in the dashboard. The RLS policy is
 * what filters this query, not the query itself.
 *
 * Nobody is flagged public yet, so today this renders the empty state and
 * stays out of the index, exactly as an empty category does under D27. It
 * flips on its own the moment Beco publishes an agent.
 */
export async function generateMetadata(): Promise<Metadata> {
  const team = await getPublicTeam();

  return {
    title: 'Our sales team',
    description:
      'The Beco Interiors sales team in Nairobi. Check that the person you are dealing with is genuinely ours before you pay anyone.',
    alternates: { canonical: '/team' },
    // A page listing nobody is thin content. Same gate as an empty category,
    // and the same reason: it should be reachable and designed, not indexed.
    ...(team.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function TeamPage() {
  const team = await getPublicTeam();

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
      <PageHeader
        className="mb-14"
        eyebrow="Who you are dealing with"
        title="The sales team."
        aside={
          team.length > 0 ? (
            <p className="font-ui text-sm text-neutral-500">
              {team.length} {team.length === 1 ? 'agent' : 'agents'}
            </p>
          ) : undefined
        }
        lede="Everyone here is on our counter or on the road for us. If someone asks you to pay for a Beco order and they are not on this page, call the business line before you send anything."
      />

      {team.length === 0 ? (
        <section className="border-t border-neutral-200 pt-12">
          <p className="max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
            We are photographing the team now. Until this page is filled in, the business line
            below is the way to confirm that you are dealing with Beco. It is answered at the
            showroom, and whoever picks it up can confirm an agent by name.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={SITE.phoneHref} className={buttonClasses({ variant: 'primary' })}>
              Call {SITE.phone}
            </a>
            <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
              Visit the showroom
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <Reveal key={member.id} delay={(i % 3) * 60}>
              <article className="flex h-full flex-col">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                  {member.public_photo ? (
                    <Image
                      src={member.public_photo.path}
                      alt={member.public_photo.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      {...blurProps(member.public_photo)}
                      className="object-cover"
                    />
                  ) : (
                    // No stock portrait and no initials in a circle. A plate
                    // with the name on it is honest about there being no
                    // photograph yet.
                    <div className="absolute inset-0 flex items-end bg-charcoal p-5">
                      <p className="font-display text-2xl leading-tight text-high-vis-white/70">
                        {member.full_name}
                      </p>
                    </div>
                  )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>

                <h2 className="mt-5 font-ui text-base font-semibold uppercase tracking-[0.1em] text-charcoal">
                  {member.full_name}
                </h2>
                {member.public_title ? (
                  <p className="mt-1 font-ui text-sm text-neutral-500">{member.public_title}</p>
                ) : null}

                {member.public_phone ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`tel:${member.public_phone.replace(/\s/g, '')}`}
                      className={buttonClasses({ variant: 'outline' })}
                      data-analytics="call_click"
                    >
                      Call
                    </a>
                    <a
                      href={whatsappLink(`speaking with ${member.full_name}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: 'ghost' })}
                      data-analytics="whatsapp_click"
                    >
                      WhatsApp
                    </a>
                  </div>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      )}

      <section className="mt-24 border-t border-neutral-200 pt-12">
        <p className="max-w-[30ch] font-display text-3xl leading-[1.12] text-charcoal sm:text-4xl">
          Paying for an order? Check here first.
        </p>
        <p className="mt-5 max-w-[58ch] text-base leading-[1.65] text-neutral-700">
          Beco quotes are issued with a reference number and our own banking details. If a
          payment request does not match the quote you were sent, stop and call{' '}
          <a
            href={SITE.phoneHref}
            className="font-semibold text-charcoal underline-offset-4 hover:underline"
          >
            {SITE.phone}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
