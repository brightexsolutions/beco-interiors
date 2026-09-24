'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Button, ConfirmDialog, EmptyState, FormSection, Input, Notice, QuantityStepper, Textarea,
  buttonClasses, cn, Field as UiField,
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
  // Controlled, like fulfilment above, so the card each sits in can carry a
  // selected state (border, fill) without reaching for a CSS-only :has()
  // trick for something this important to get right.
  const [wantsInstallation, setWantsInstallation] = useState(false);
  const [wantsSamples, setWantsSamples] = useState(false);
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
              href={whatsappLink(`here is my quote reference, ${result.reference}`)}
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
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            While you wait
          </p>
          <p className="mt-4 max-w-[36ch] font-display text-2xl leading-snug">
            Keep the reference. Everything else is on us.
          </p>
          <dl className="mt-8 space-y-5 border-t border-white/15 pt-6">
            <div>
              <dt className="font-ui text-sm text-neutral-300">Opening hours</dt>
              <dd className="mt-1 font-ui text-base">{SITE.hours}</dd>
            </div>
            <div>
              <dt className="font-ui text-sm text-neutral-300">Prefer to call</dt>
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
              <dt className="font-ui text-sm text-neutral-300">Showroom</dt>
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
    // items-start, not the grid default of stretch: a three item list next to
    // a nine field form otherwise forces the charcoal panel to inflate to the
    // form's height, leaving a dead void of plain charcoal below the last row.
    // Confirmed directly by screenshot, not assumed. Each column now ends
    // where its own content ends.
    <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* --- The list ---
          A charcoal panel, not a third white block beside the form: the same
          surface the confirmation screen already uses below. Two columns of
          white on white read as one undifferentiated form, reported directly
          as the cart having no designed layout of its own. No entrance motion
          on the rows: this is a task the reader is already mid way through,
          not a marketing section arriving on scroll, and a fade stepped
          across every row is the generic stagger every list like this
          reaches for. */}
      <section
        aria-labelledby="list-heading"
        // Sticky from lg up, where the two columns actually sit side by
        // side: the form below is nine fields long and this panel is often
        // three, so without this the reader scrolls the list out of view
        // long before "Send my request" and cannot check what they are
        // actually asking for. top-24 clears the site header (80px plus its
        // hairline) with room to breathe. Unset below lg, where the columns
        // stack and "sticky" would just pin the list over the top of the
        // form as the reader scrolls past it.
        className="bg-charcoal p-8 text-high-vis-white lg:sticky lg:top-24 lg:p-10"
      >
        {/* No "Your list" eyebrow here: the page's own PageHeader already
            claims that exact phrase above the title. A second eyebrow one
            beat later was the page repeating itself, so the count carries
            the panel's identity instead, the way a number in the confirmation
            panel below already does with the reference. */}
        <div className="flex items-start justify-between gap-4">
          <h2 id="list-heading" className="flex items-baseline gap-3">
            <span className="font-display text-6xl leading-none tabular-nums">
              {lineCount(lines)}
            </span>
            <span className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              item{lineCount(lines) === 1 ? '' : 's'} listed
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex min-h-11 shrink-0 items-center font-ui text-sm font-semibold text-neutral-300 underline-offset-4 hover:text-high-vis-white hover:underline"
          >
            Clear the list
          </button>
        </div>

        {/* Capped and internally scrollable from lg up only: a sticky panel
            with an uncapped list can grow taller than the viewport itself,
            which pins it in place while leaving its own bottom rows
            unreachable. A list this size, 60 lines at the schema's own
            ceiling, is the case this guards, not the ordinary one. */}
        <ul className="mt-8 border-t border-white/15 lg:max-h-[46vh] lg:overflow-y-auto">
          {lines.map((line) => (
            <li key={line.slug} className="flex gap-6 border-b border-white/15 py-8">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-neutral-100 sm:h-32 sm:w-28 after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15">
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  // No photograph yet. A single hairline read as an empty,
                  // broken chip once actually rendered, confirmed by
                  // screenshot: it needs enough presence to read as a mark
                  // rather than nothing. A square outline keeps the site's
                  // sharp, unrounded language and reads as a swatch still to
                  // be photographed, not as a person's avatar or a missing
                  // file icon. aria-hidden since the link below already
                  // carries the name as the accessible text.
                  <span aria-hidden className="flex h-full w-full items-center justify-center">
                    <span className="h-8 w-8 border border-charcoal/30" />
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl leading-tight sm:text-2xl">
                    <Link
                      href={`/product/${line.slug}`}
                      className="group relative inline-block focus:outline-none focus-visible:underline focus-visible:decoration-warm-red focus-visible:underline-offset-4"
                    >
                      {line.name}
                      {/* The same hairline-draws-in hover ProductCard uses,
                          rather than a text colour change: white is already
                          the brightest this text goes, so a colour swap has
                          nowhere to move to on this panel. */}
                      <span
                        aria-hidden
                        className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-warm-red transition-transform duration-300 ease-brand group-hover:scale-x-100 motion-reduce:transition-none"
                      />
                    </Link>
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeLine(line.slug)}
                    aria-label={`Remove ${line.name} from your quote list`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-300 transition-colors duration-200 ease-brand hover:bg-white/10 hover:text-high-vis-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-warm-red"
                  >
                    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {/* Half slab steps for anything sold "per slab", since a
                    slab is cut to order. Whole steps otherwise: "2.5
                    handles" is not a thing Beco can price. A solid white
                    control on the dark panel by design: QuantityStepper
                    never adapts to its surroundings, so it reads the same
                    way everywhere it is used. */}
                <QuantityStepper
                  value={line.quantity}
                  onChange={(next) => setQuantity(line.slug, next)}
                  label={line.name}
                  step={line.unit === 'per slab' ? 0.5 : 1}
                  unit={line.unit}
                />
              </div>
            </li>
          ))}
        </ul>

        {/* Forgetting something is the ordinary case, not the edge case, and
            until now the only way back to the shop was the header nav,
            which this panel sits well below by the time the list has any
            length. A real link, not a button with no destination: it must
            navigate, per rule 3, which is why it is an <a> via next/link
            rather than an onClick. */}
        <Link
          href="/shop"
          className="mt-6 flex min-h-11 items-center justify-center gap-2 border border-white/25 px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-high-vis-white transition-colors duration-200 ease-brand hover:border-white/50 hover:bg-white/5"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 stroke-current" fill="none" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add more materials
        </Link>

        <Notice className="mt-6 max-w-[52ch] text-neutral-300">
          Everything here is priced on request, so there is no total to show yet. We will send an
          itemised quote with delivery or collection set out.
        </Notice>
      </section>

      {/* --- The form --- */}
      <section aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-display text-3xl text-charcoal">
          Where should we send it?
        </h2>
        <p className="mt-3 max-w-[52ch] font-ui text-sm text-neutral-500">
          Your name and phone number are all we genuinely need. Everything else just helps us
          price it faster.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-10">
          <FormSection title="Your details" columns={2}>
            <Field
              label="Your name" name="customerName" required
              placeholder="Jane Wanjiru" error={fieldError('customerName')}
            />
            <Field
              label="Phone number" name="customerPhone" type="tel" required
              autoComplete="tel" placeholder="0722 000 000" error={fieldError('customerPhone')}
            />
            <Field
              label="Email" name="customerEmail" type="email" autoComplete="email"
              placeholder="jane@email.com" error={fieldError('customerEmail')} hint="Optional"
            />
            <Field
              label="Company" name="company" placeholder="Company name"
              hint="Optional" error={fieldError('company')}
            />
          </FormSection>

          <FormSection title="The project">
            <Field
              label="What is the project?" name="projectType"
              placeholder="Kitchen refit, new build, office fit-out"
              hint="Optional" error={fieldError('projectType')}
            />
            <UiField
              label="Anything else we should know?"
              htmlFor="projectDetails"
              hint="Optional"
            >
              <Textarea
                id="projectDetails"
                name="projectDetails"
                placeholder="Room dimensions, finish preferences, timeline, anything else that helps us price it"
              />
            </UiField>
          </FormSection>

          <fieldset>
            <legend className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Collection or delivery?
            </legend>
            {/* A bordered, selectable card each, not a bare radio dot and a
                label: the dot alone is a small, easy to miss target next to
                a form full of bordered inputs, and the selected state was
                otherwise carried by nothing but the dot's own fill. */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[['pickup', 'I will collect'], ['delivery', 'Please deliver']].map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-center font-ui text-base transition-colors duration-200 ease-brand',
                    fulfilment === value
                      ? 'border-charcoal bg-neutral-50'
                      : 'border-neutral-300 hover:border-charcoal',
                  )}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    value={value}
                    checked={fulfilment === value}
                    onChange={() => setFulfilment(value as 'pickup' | 'delivery')}
                    className="h-4 w-4 shrink-0 accent-[var(--color-warm-red-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Said at the moment of choosing, not in the small print. A slab
                is 65,000 and a customer who reads that as the delivered price
                is a customer surprised by the invoice. */}
            {fulfilment === 'delivery' ? (
              <Notice className="mt-4">
                Delivery is charged separately and depends on where the site is. We will put it
                on the quote as its own line so you can see it.
              </Notice>
            ) : null}

            {fulfilment === 'delivery' ? (
              <Field
                label="Delivery address" name="deliveryAddress" hint="Where is the site?"
                placeholder="Street, area, estate" error={fieldError('deliveryAddress')}
                className="mt-4"
              />
            ) : null}
          </fieldset>

          {/* Two things people ring up to ask, asked here instead. */}
          <fieldset>
            <legend className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Anything else you need?
            </legend>
            <div className="mt-3 space-y-3">
              <label
                className={cn(
                  'flex cursor-pointer gap-3 border px-4 py-3.5 font-ui text-base transition-colors duration-200 ease-brand',
                  wantsInstallation ? 'border-charcoal bg-neutral-50' : 'border-neutral-300 hover:border-charcoal',
                )}
              >
                <input
                  type="checkbox"
                  name="wantsInstallation"
                  checked={wantsInstallation}
                  onChange={(event) => setWantsInstallation(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-warm-red-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
                />
                <span>
                  Installation
                  <span className="block font-ui text-sm text-neutral-500">
                    We install as well as supply. Charged separately, and quoted with the
                    materials.
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer gap-3 border px-4 py-3.5 font-ui text-base transition-colors duration-200 ease-brand',
                  wantsSamples ? 'border-charcoal bg-neutral-50' : 'border-neutral-300 hover:border-charcoal',
                )}
              >
                <input
                  type="checkbox"
                  name="wantsSamples"
                  checked={wantsSamples}
                  onChange={(event) => setWantsSamples(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-warm-red-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
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
  label, name, type = 'text', required, hint, error, placeholder, autoComplete, className,
}: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; error?: string | undefined; placeholder?: string; autoComplete?: string;
  className?: string;
}) {
  return (
    <UiField label={label} htmlFor={name} hint={hint} error={error} className={className}>
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
