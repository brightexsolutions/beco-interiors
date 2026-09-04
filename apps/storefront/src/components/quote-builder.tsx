'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Button, ConfirmDialog, EmptyState, Input, Textarea, buttonClasses,
  Field as UiField,
} from '@beco/ui';
import {
  clearList, lineCount, readList, removeLine, setQuantity, subscribe,
  type QuoteLine,
} from '@/lib/quote-list';
import { submitQuote, type SubmitResult } from '@/app/quote/actions';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * The quote builder.
 *
 * No account, and only two required fields, because every extra required
 * field is a reason to leave. On success the list is cleared and the reference
 * is shown with a WhatsApp handoff, so the conversation can continue in the
 * channel most buyers here actually use.
 */
export function QuoteBuilder() {
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery' | ''>('');
  const [pending, startTransition] = useTransition();

  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setLines(readList());
    update();
    setMounted(true);
    return subscribe(update);
  }, []);

  // The confirmation is a fraction of the height of the form and the list it
  // replaces, so the page collapses under the reader. The browser keeps the
  // scroll offset they already had, which on a list of any length lands them
  // in the FOOTER, looking at nothing, having just been given a reference
  // number they never saw.
  //
  // Brought into view instantly rather than smoothly, deliberately: the
  // content underneath them has just been swapped, so animating the journey
  // implies a continuity that is not there. Focus moves with it, so the
  // outcome is announced to a screen reader instead of being silently
  // exchanged, which is the same event either way.
  useEffect(() => {
    if (!result?.ok) return;
    const el = doneRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.querySelector<HTMLElement>('[data-confirmation]')?.focus();
  }, [result]);

  // The list is in localStorage, so the server cannot know it. Rendering
  // nothing until mounted avoids showing an empty state to someone who has a
  // full list.
  if (!mounted) return <div className="min-h-[40vh]" aria-busy="true" />;

  if (result?.ok) {
    return (
      // Same two column shape the form uses below, rather than a single
      // narrow block dropped into the full width page: that read as a
      // document with most of a 1380px page left blank beside it. The right
      // column states real information, hours and the line, not a photo
      // standing in for content, so the space is used rather than merely
      // balanced.
      <div ref={doneRef} className="grid gap-12 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Request received
          </p>
          <h2
            data-confirmation
            tabIndex={-1}
            className="mt-4 font-display text-4xl leading-tight text-charcoal outline-none"
          >
            We have it. Reference {result.reference}.
          </h2>
          <p className="mt-4 max-w-[52ch] text-base text-neutral-700">
            Our team is pricing it now and will come back to you on the number you gave us. If it
            is urgent, send us the reference on WhatsApp and we will pick it up straight away.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={whatsappLink(`my quote ${result.reference}`)}
              data-analytics="whatsapp_click"
              className={buttonClasses({ variant: 'primary' })}
            >
              Send the reference on WhatsApp
            </a>
            <Link href="/shop" className={buttonClasses({ variant: 'outline' })}>
              Keep browsing
            </Link>
          </div>
        </div>

        <div className="bg-charcoal p-8 text-high-vis-white lg:p-10">
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            While you wait
          </p>
          <p className="mt-4 max-w-[36ch] font-display text-2xl leading-snug">
            Keep the reference. Everything else is on us.
          </p>
          <dl className="mt-8 space-y-5 border-t border-white/15 pt-6">
            <div>
              <dt className="font-ui text-sm text-neutral-400">Opening hours</dt>
              <dd className="mt-1 font-ui text-base">{SITE.hours}</dd>
            </div>
            <div>
              <dt className="font-ui text-sm text-neutral-400">Prefer to call</dt>
              <dd className="mt-1">
                <a
                  href={SITE.phoneHref}
                  data-analytics="call_click"
                  className="font-ui text-base font-semibold underline-offset-4 hover:underline"
                >
                  {SITE.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-ui text-sm text-neutral-400">Showroom</dt>
              <dd className="mt-1 font-ui text-base">
                {SITE.address.line1}, {SITE.address.line2}, {SITE.address.city}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your quote list is empty"
        description="Add the materials your project needs and we will price the whole list at once."
        action={
          <Link href="/shop" className={buttonClasses({ variant: 'primary' })}>
            Browse the range
          </Link>
        }
      />
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: String(form.get('customerName') ?? ''),
      customerPhone: String(form.get('customerPhone') ?? ''),
      customerEmail: String(form.get('customerEmail') ?? ''),
      company: String(form.get('company') ?? '') || undefined,
      projectType: String(form.get('projectType') ?? '') || undefined,
      fulfilment: fulfilment || undefined,
      deliveryAddress: String(form.get('deliveryAddress') ?? '') || undefined,
      projectDetails: String(form.get('projectDetails') ?? '') || undefined,
      wantsInstallation: form.get('wantsInstallation') === 'on',
      wantsSamples: form.get('wantsSamples') === 'on',
      items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
    };
    startTransition(async () => {
      const outcome = await submitQuote(payload);
      setResult(outcome);
      if (outcome.ok) clearList();
    });
  };

  const fieldError = (name: string) =>
    !result?.ok && result?.fieldErrors?.[name]?.[0] ? result.fieldErrors[name][0] : undefined;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* --- The list --- */}
      <section aria-labelledby="list-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="list-heading" className="font-display text-2xl text-charcoal">
            {lineCount(lines)} item{lineCount(lines) === 1 ? '' : 's'}
          </h2>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="font-ui text-sm font-semibold text-neutral-500 underline-offset-4 hover:text-warm-red-deep hover:underline"
          >
            Clear the list
          </button>
        </div>

        <ul className="mt-6 border-t border-neutral-200">
          {lines.map((line) => (
            <li key={line.slug} className="flex gap-4 border-b border-neutral-200 py-5">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-neutral-100">
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/product/${line.slug}`}
                    className="font-display text-xl leading-tight text-charcoal hover:text-warm-red-deep"
                  >
                    {line.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeLine(line.slug)}
                    aria-label={`Remove ${line.name} from your quote list`}
                    className="shrink-0 font-ui text-sm text-neutral-500 underline-offset-4 hover:text-warm-red-deep hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {/* Half slab steps for anything sold "per slab", since a
                      slab is cut to order. Whole steps otherwise: "2.5
                      handles" is not a thing Beco can price. */}
                  <div className="flex items-stretch rounded-[2px] border border-neutral-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.slug, line.quantity - (line.unit === 'per slab' ? 0.5 : 1))}
                      aria-label={`Decrease quantity of ${line.name}`}
                      className="flex h-11 w-11 items-center justify-center text-xl text-charcoal"
                    >
                      &minus;
                    </button>
                    <span className="flex h-11 w-12 items-center justify-center border-x border-neutral-300 font-ui text-base tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.slug, line.quantity + (line.unit === 'per slab' ? 0.5 : 1))}
                      aria-label={`Increase quantity of ${line.name}`}
                      className="flex h-11 w-11 items-center justify-center text-xl text-charcoal"
                    >
                      +
                    </button>
                  </div>
                  {line.unit ? (
                    <span className="font-ui text-sm text-neutral-500">{line.unit}</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-[58ch] font-ui text-sm text-neutral-500">
          Everything here is priced on request, so there is no total to show yet. We will send an
          itemised quote with delivery or collection set out.
        </p>
      </section>

      {/* --- The form --- */}
      <section aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-display text-2xl text-charcoal">
          Where should we send it?
        </h2>
        <p className="mt-2 max-w-[52ch] font-ui text-sm text-neutral-500">
          Your name and phone number are all we genuinely need. Everything else just helps us
          price it faster.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          <Field label="Your name" name="customerName" required error={fieldError('customerName')} />
          <Field
            label="Phone number" name="customerPhone" type="tel" required
            autoComplete="tel" placeholder="0722 000 000" error={fieldError('customerPhone')}
          />
          <Field
            label="Email" name="customerEmail" type="email" autoComplete="email"
            error={fieldError('customerEmail')} hint="Optional"
          />
          <Field label="Company" name="company" hint="Optional" error={fieldError('company')} />
          <Field
            label="What is the project?" name="projectType" hint="Optional, for example a kitchen refit"
            error={fieldError('projectType')}
          />

          <fieldset>
            <legend className="font-ui text-sm font-semibold text-charcoal">
              Collection or delivery?
            </legend>
            <div className="mt-2 flex gap-6">
              {[['pickup', 'I will collect'], ['delivery', 'Please deliver']].map(([value, label]) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 font-ui text-base">
                  <input
                    type="radio"
                    name="fulfilment"
                    value={value}
                    checked={fulfilment === value}
                    onChange={() => setFulfilment(value as 'pickup' | 'delivery')}
                    className="h-4 w-4 accent-[var(--color-warm-red-deep)]"
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Said at the moment of choosing, not in the small print. A slab
                is 65,000 and a customer who reads that as the delivered price
                is a customer surprised by the invoice. */}
            {fulfilment === 'delivery' ? (
              <p className="mt-3 border-l-2 border-warm-red bg-neutral-50 py-3 pl-4 pr-3 font-ui text-sm text-neutral-700">
                Delivery is charged separately and depends on where the site is. We will put it
                on the quote as its own line so you can see it.
              </p>
            ) : null}
          </fieldset>

          {fulfilment === 'delivery' ? (
            <Field
              label="Delivery address" name="deliveryAddress" hint="Where is the site?"
              error={fieldError('deliveryAddress')}
            />
          ) : null}

          {/* Two things people ring up to ask, asked here instead. */}
          <fieldset>
            <legend className="font-ui text-sm font-semibold text-charcoal">
              Anything else you need?
            </legend>
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer gap-3 font-ui text-base">
                <input
                  type="checkbox"
                  name="wantsInstallation"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-warm-red-deep)]"
                />
                <span>
                  Installation
                  <span className="block font-ui text-sm text-neutral-500">
                    We install as well as supply. Charged separately, and quoted with the
                    materials.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 font-ui text-base">
                <input
                  type="checkbox"
                  name="wantsSamples"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-warm-red-deep)]"
                />
                <span>
                  Samples first
                  <span className="block font-ui text-sm text-neutral-500">
                    Sensible on a large specification. We will get pieces to you or to your
                    client before you commit.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <UiField
            label="Anything else we should know?"
            htmlFor="projectDetails"
            hint="Optional"
          >
            <Textarea id="projectDetails" name="projectDetails" />
          </UiField>

          {result && !result.ok ? (
            <p role="alert" className="rounded-[2px] border border-error px-4 py-3 font-ui text-base text-error">
              {result.error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="large" disabled={pending} className="w-full">
            {pending ? 'Sending…' : 'Send my request'}
          </Button>

          <p className="font-ui text-sm text-neutral-500">
            Would rather talk? Call{' '}
            <a href={SITE.phoneHref} data-analytics="call_click" className="font-semibold text-charcoal underline-offset-4 hover:underline">
              {SITE.phone}
            </a>
            .
          </p>
        </form>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear your quote list?"
        description={`This removes all ${lineCount(lines)} items. It cannot be undone.`}
        confirmLabel="Clear the list"
        destructive
        onConfirm={() => {
          clearList();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

/**
 * The form's own shorthand over the shared primitives.
 *
 * Every field here is a labelled text input wired to the same id, so the call
 * sites stay one line each. The styling, the error wiring and the type floor
 * now live in @beco/ui, per rule 5, rather than being written out again here.
 */
function Field({
  label, name, type = 'text', required, hint, error, placeholder, autoComplete,
}: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; error?: string | undefined; placeholder?: string; autoComplete?: string;
}) {
  return (
    <UiField label={label} htmlFor={name} hint={hint} error={error}>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
      />
    </UiField>
  );
}
