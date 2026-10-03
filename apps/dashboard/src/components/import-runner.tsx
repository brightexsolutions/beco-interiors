'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, ChipGroup, ConfirmDialog, Notice, Panel, useActionToast } from '@beco/ui';
import {
  IMPORT_MODES,
  IMPORT_MODE_HINT,
  IMPORT_MODE_LABEL,
  IMPORT_TARGETS,
  type ImportMode,
  type ImportTarget,
} from '@beco/validation';
import { startImport, type ImportActionState } from '@/app/(app)/products/import/actions';

const INITIAL: ImportActionState = {};

/**
 * Start a catalogue import without a laptop. Two choices, one button. An
 * import that writes to production asks first, naming what it will do; a
 * check run and anything on staging start straight away. The result is a
 * toast plus a line under the button, since the run itself takes minutes
 * and shows up in the list below rather than here.
 */
export function ImportRunner({
  configured,
  missing,
  canTargetProduction,
}: {
  configured: boolean;
  missing: string[];
  canTargetProduction: boolean;
}) {
  const [state, dispatch, pending] = useActionState(startImport, INITIAL);
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<ImportMode>('dry-run');
  const [target, setTarget] = useState<ImportTarget>('staging');
  const [confirming, setConfirming] = useState(false);
  useActionToast(state);

  const payload = () => {
    const form = new FormData();
    form.set('mode', mode);
    form.set('target', target);
    return form;
  };
  const run = () => startTransition(() => dispatch(payload()));
  const needsConfirm = target === 'production' && mode !== 'dry-run';

  const targets = IMPORT_TARGETS.filter((t) => t !== 'production' || canTargetProduction).map((t) => ({
    value: t,
    label: t === 'staging' ? 'Staging' : 'Production',
  }));

  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">Run the Drive import</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">
            Reads BECO PRODUCTS in Drive, writes ranges, products and photographs.
          </p>
        </div>
      }
    >
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {!configured ? (
          <Notice tone="alert">
            Not connected to GitHub yet ({missing.join(', ')} not set), so nothing can start from here.
            Until then the import runs from a terminal with <code className="font-mono text-sm">pnpm drive:import</code>.
          </Notice>
        ) : null}

        <div>
          <p className="mb-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">What</p>
          <ChipGroup
            label="What the import should do"
            options={IMPORT_MODES.map((m) => ({ value: m, label: IMPORT_MODE_LABEL[m] }))}
            value={mode}
            onChange={(value) => setMode(value as ImportMode)}
          />
          <p className="mt-2 font-ui text-sm text-neutral-500">{IMPORT_MODE_HINT[mode]}</p>
        </div>

        <div>
          <p className="mb-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Where</p>
          <ChipGroup
            label="Which site"
            options={targets}
            value={target}
            onChange={(value) => setTarget(value as ImportTarget)}
          />
          <p className="mt-2 font-ui text-sm text-neutral-500">
            {target === 'production'
              ? 'The live site. Products appear on www.beco.co.ke as soon as the run finishes.'
              : 'The staging site. Nothing a customer sees changes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => (needsConfirm ? setConfirming(true) : run())}
            disabled={!configured || pending}
          >
            {pending ? 'Starting' : mode === 'dry-run' ? 'Check Drive' : 'Start import'}
          </Button>
          {state.ok ? (
            <p role="status" className="font-ui text-sm text-charcoal">{state.ok}</p>
          ) : null}
          {state.error ? (
            <p role="alert" className="font-ui text-sm text-error">{state.error}</p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={mode === 'force' ? 'Re-encode every photograph on production?' : 'Import to production?'}
        description={
          mode === 'force'
            ? 'Every photograph is downloaded and encoded again and every product gallery rewritten on the live site. Prices, names and ranges set in the dashboard are kept. This takes a long time.'
            : 'New and changed photographs in Drive are written to the live site, new ranges and products are created, and the shop refreshes when the run finishes. Prices, names and ranges set in the dashboard are kept.'
        }
        confirmLabel={mode === 'force' ? 'Re-encode on production' : 'Import to production'}
        destructive
        onConfirm={() => {
          setConfirming(false);
          run();
        }}
      />
    </Panel>
  );
}
