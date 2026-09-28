import { quoteFromLines, quotePaymentBlocks, type QuotePdfInput } from '@beco/documents/layout';

export interface DocumentPreviewValues {
  businessLegalName: string;
  businessAddress: string;
  businessEmail: string;
  kraPin: string;
  vatNumber: string;
  businessPhone: string;
  bankDetails: string;
  tillNumber: string;
  paybillNumber: string;
  paybillAccount: string;
  sendMoneyNumber: string;
}

/**
 * The top and the payment box of a quote, drawn from what is typed in
 * Settings before it is saved. Built from the same `quoteFromLines` and
 * `quotePaymentBlocks` the PDF uses, so the preview cannot say one thing
 * while the document prints another.
 */
export function SettingsDocumentPreview({ values }: { values: DocumentPreviewValues }) {
  const input = {
    phone: values.businessPhone.trim() || '+254 722 333 730',
    bankDetails: values.bankDetails.trim(),
    tillNumber: values.tillNumber.trim(),
    paybillNumber: values.paybillNumber.trim(),
    paybillAccount: values.paybillAccount.trim(),
    sendMoneyNumber: values.sendMoneyNumber.trim(),
    business: {
      legalName: values.businessLegalName,
      address: values.businessAddress,
      email: values.businessEmail,
      kraPin: values.kraPin.toUpperCase(),
      vatNumber: values.vatNumber.toUpperCase(),
    },
  } as QuotePdfInput;
  const from = quoteFromLines(input);
  const payments = quotePaymentBlocks(input);

  return (
    <figure aria-label="As printed on a quote" className="font-ui">
      <figcaption className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
        As printed on a quote
      </figcaption>
      <div className="border border-neutral-200 bg-high-vis-white">
        <div className="flex items-center gap-3 bg-charcoal px-4 py-3">
          <img src="/logo-mark.png" alt="" width={28} height={27} className="h-7 w-7" />
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-high-vis-white">Quotation</span>
        </div>
        <div aria-hidden className="h-[3px] bg-warm-red" />
        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">From</p>
            <p data-testid="preview-from-name" className="mt-1 text-base font-semibold text-charcoal">
              {from.name}
            </p>
            {from.lines.map((line) => (
              <p key={line} className="break-words text-sm text-neutral-700">
                {line}
              </p>
            ))}
            {from.tax.length > 0 ? (
              <p data-testid="preview-tax" className="mt-1 text-sm font-semibold tabular-nums text-charcoal">
                {from.tax.join(' · ')}
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">KRA PIN not set, so none prints</p>
            )}
          </div>

          <div className="border-l-4 border-l-charcoal bg-neutral-50 px-3 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-charcoal">How to pay</p>
            {payments.length > 0 ? (
              <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                {payments.map((block) => (
                  <div key={block.label} className="min-w-0">
                    <dt className="text-sm text-neutral-500">{block.label}</dt>
                    {block.lines.map((line) => (
                      <dd key={line} className="whitespace-pre-line break-words text-sm tabular-nums text-charcoal">
                        {line}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">No payment channel set, so this box is left off</p>
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}
