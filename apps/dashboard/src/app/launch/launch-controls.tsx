'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, ConfirmDialog, Field, Input } from '@beco/ui';
import { goLive, saveLaunchDate, standDown, type LaunchActionState } from './actions';

const INITIAL: LaunchActionState = {};

/** ISO instant to the naive local value a datetime-local input wants. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function LaunchControls({
  launchAt,
  isLive,
}: {
  launchAt: string | null;
  isLive: boolean;
}) {
  const [dateState, saveDate, savingDate] = useActionState(saveLaunchDate, INITIAL);
  const [switchState, setSwitchState] = useState<LaunchActionState>({});
  const [confirming, setConfirming] = useState<null | 'live' | 'down'>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<LaunchActionState>) =>
    startTransition(async () => {
      setSwitchState(await fn());
      setConfirming(null);
    });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Status
        </h2>
        <p className="mt-2 font-ui text-base text-charcoal">
          {isLive ? 'Live. The countdown is replaced by the anniversary reveal.' : 'Counting down.'}
        </p>
        <p className="mt-1 font-ui text-sm text-neutral-600">
          {launchAt
            ? `Aiming for ${new Date(launchAt).toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })}`
            : 'No date set yet, so the storefront shows nothing.'}
        </p>
      </section>

      <form action={saveDate} className="space-y-4">
        <Field
          label="Countdown target"
          htmlFor="launchAt"
          hint="Local time. Leave blank to clear it."
          error={dateState.error}
        >
          <Input
            id="launchAt"
            name="launchAt"
            type="datetime-local"
            defaultValue={toLocalInput(launchAt)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={savingDate}>
          {savingDate ? 'Saving' : 'Save date'}
        </Button>
        {dateState.ok ? (
          <p role="status" className="font-ui text-sm text-charcoal">{dateState.ok}</p>
        ) : null}
      </form>

      <section className="border-t border-neutral-200 pt-8">
        <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
          The switch
        </h2>
        <p className="mb-4 mt-2 max-w-[52ch] font-ui text-sm text-neutral-600">
          This is the moment itself. The next visitor to any page sees the reveal play once.
        </p>

        {isLive ? (
          <Button variant="outline" onClick={() => setConfirming('down')} disabled={pending}>
            Revert to the countdown
          </Button>
        ) : (
          <Button onClick={() => setConfirming('live')} disabled={pending}>
            Launch the site
          </Button>
        )}

        {switchState.ok ? (
          <p role="status" className="mt-3 font-ui text-sm text-charcoal">{switchState.ok}</p>
        ) : null}
        {switchState.error ? (
          <p role="alert" className="mt-3 font-ui text-sm text-error">{switchState.error}</p>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirming === 'live'}
        onOpenChange={(o) => setConfirming(o ? 'live' : null)}
        title="Launch the Beco site"
        description="Every visitor stops seeing the countdown and sees the anniversary reveal instead. You can revert this, but the reveal will have been seen."
        confirmLabel="Launch the site"
        destructive
        onConfirm={() => run(goLive)}
      />
      <ConfirmDialog
        open={confirming === 'down'}
        onOpenChange={(o) => setConfirming(o ? 'down' : null)}
        title="Revert to the countdown"
        description="The storefront goes back to counting down to the target date. Anyone who already saw the reveal will not see it again."
        confirmLabel="Revert"
        onConfirm={() => run(standDown)}
      />
    </div>
  );
}
