'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, ConfirmDialog, Field, Select, Textarea, buttonClasses, cn, useActionToast } from '@beco/ui';
import {
  approveQuote,
  assignQuote,
  claimQuote,
  reissueQuote,
  reopenQuote,
  setQuoteStatus,
  type QuoteActionState,
} from '@/app/(app)/quotes/actions';
import { convertQuoteToOrder, type OrderActionState } from '@/app/(app)/orders/actions';
import type { QuoteAssignee } from '@/lib/quote-detail';
import type { QuoteStatus } from '@beco/types';

const INITIAL: QuoteActionState = {};
const CONVERT_INITIAL: OrderActionState = {};

const Lock = ({ quoteId, updatedAt }: { quoteId: string; updatedAt: string }) => (
  <>
    <input type="hidden" name="quoteId" value={quoteId} />
    <input type="hidden" name="updatedAt" value={updatedAt} />
  </>
);

export function QuoteActions({
  quoteId,
  updatedAt,
  reference,
  status,
  assignedTo,
  assignedToName,
  requiresApproval,
  approvedAt,
  canClaim,
  canMutate,
  canAssign,
  canApprove,
  expired,
  assignees,
  convertedOrderReference,
}: {
  quoteId: string;
  updatedAt: string;
  reference: string;
  status: QuoteStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  requiresApproval: boolean;
  approvedAt: string | null;
  canClaim: boolean;
  canMutate: boolean;
  canAssign: boolean;
  canApprove: boolean;
  expired: boolean;
  assignees: QuoteAssignee[];
  convertedOrderReference: string | null;
}) {
  const [claimState, claim, claiming] = useActionState(claimQuote, INITIAL);
  const [assignState, assign, assigning] = useActionState(assignQuote, INITIAL);
  const [statusState, setStatus, setting] = useActionState(setQuoteStatus, INITIAL);
  const [approveState, approve, approving] = useActionState(approveQuote, INITIAL);
  const [reissueState, reissue, reissuing] = useActionState(reissueQuote, INITIAL);
  const [reopenState, reopen, reopening] = useActionState(reopenQuote, INITIAL);
  const [convertState, convert, converting] = useActionState(convertQuoteToOrder, CONVERT_INITIAL);
  const [lostOpen, setLostOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  // Which status button was pressed, so only that one shows the spinner.
  const [pendingStatus, setPendingStatus] = useState<QuoteStatus | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  useActionToast(claimState);
  useActionToast(assignState);
  useActionToast(statusState);
  useActionToast(approveState);
  useActionToast(reissueState);
  useActionToast(reopenState);
  useActionToast(convertState);

  useEffect(() => {
    if (convertState.orderReference) router.push(`/orders/${convertState.orderReference}`);
  }, [convertState.orderReference, router]);

  const nextStatuses: { status: QuoteStatus; label: string }[] = [];
  if (canMutate && status !== 'won' && status !== 'lost') {
    if (status === 'new') nextStatuses.push({ status: 'reviewing', label: 'Reviewing' });
    if (status === 'new' || status === 'reviewing') nextStatuses.push({ status: 'quoted', label: 'Quoted' });
    if (status === 'quoted') nextStatuses.push({ status: 'won', label: 'Won' });
    if (status === 'reviewing' || status === 'quoted') nextStatuses.push({ status: 'lost', label: 'Lost' });
  }

  return (
    <div className="space-y-3">
      {canClaim ? (
        <form action={claim}>
          <Lock quoteId={quoteId} updatedAt={updatedAt} />
          <Button type="submit" variant="secondary" pending={claiming} className="h-11 w-full py-0">
            {claiming ? 'Claiming' : 'Claim quote'}
          </Button>
        </form>
      ) : null}

      {canAssign ? (
        <form action={assign}>
          <Lock quoteId={quoteId} updatedAt={updatedAt} />
          <Field className="min-w-0" label="Assign to" htmlFor="assigneeId">
            <Select
              id="assigneeId"
              name="assigneeId"
              defaultValue={assignedTo ?? ''}
              required
              disabled={assigning}
              aria-busy={assigning}
              onChange={(event) => {
                const next = event.currentTarget.value;
                if (!next || next === assignedTo) return;
                event.currentTarget.form?.requestSubmit();
              }}
            >
              <option value="" disabled>
                Choose a salesperson
              </option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      ) : (
        <p className="font-ui text-sm text-neutral-500">
          {assignedToName ? `Assigned to ${assignedToName}.` : 'Unassigned. Claim it to edit.'}
        </p>
      )}

      {canApprove ? (
        <form action={approve}>
          <Lock quoteId={quoteId} updatedAt={updatedAt} />
          <Button type="submit" pending={approving} className="h-11 w-full py-0">
            {approving ? 'Approving' : 'Approve'}
          </Button>
        </form>
      ) : null}

      {requiresApproval && !approvedAt && !canApprove ? (
        <p className="font-ui text-sm text-neutral-700">
          Waiting on admin approval before this can be marked quoted, won or lost.
        </p>
      ) : null}

      {nextStatuses.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {nextStatuses.map((item) =>
            item.status === 'lost' ? (
              <Button
                key={item.status}
                type="button"
                variant="secondary"
                className="w-full px-3"
                onClick={() => setLostOpen(true)}
              >
                Mark lost
              </Button>
            ) : (
              <form key={item.status} action={setStatus} onSubmit={() => setPendingStatus(item.status)} className="min-w-0">
                <Lock quoteId={quoteId} updatedAt={updatedAt} />
                <input type="hidden" name="status" value={item.status} />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={setting}
                  pending={setting && pendingStatus === item.status}
                  className="w-full px-3"
                >
                  {item.label}
                </Button>
              </form>
            ),
          )}
        </div>
      ) : null}

      {canMutate && status === 'won' && convertedOrderReference ? (
        <Link
          href={`/orders/${convertedOrderReference}`}
          className={cn(buttonClasses({ variant: 'secondary' }), 'h-11 w-full py-0')}
        >
          View order
        </Link>
      ) : null}

      {canMutate && status === 'won' && !convertedOrderReference ? (
        <Button
          type="button"
          variant="secondary"
          disabled={converting}
          className="h-11 w-full py-0"
          onClick={() => setConvertOpen(true)}
        >
          Convert to order
        </Button>
      ) : null}

      {canMutate && status === 'lost' ? (
        <Button
          type="button"
          variant="secondary"
          disabled={reopening}
          className="h-11 w-full py-0"
          onClick={() => setReopenOpen(true)}
        >
          Reopen
        </Button>
      ) : null}

      {expired && canMutate && status !== 'won' && status !== 'lost' ? (
        <form action={reissue}>
          <Lock quoteId={quoteId} updatedAt={updatedAt} />
          <Button type="submit" variant="ghost" pending={reissuing}>
            {reissuing ? 'Updating' : 'Re-issue'}
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        title={`Mark ${reference} lost`}
        description={
          <div className="space-y-3">
            <p>
              {reference} will be marked lost. It stays on the record. Reopen it if the client
              comes back.
            </p>
            <Field label="Why it was lost" htmlFor="lost-reason">
              <Textarea
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                rows={3}
                maxLength={400}
              />
            </Field>
          </div>
        }
        confirmLabel="Mark lost"
        destructive
        onConfirm={() => {
          const data = new FormData();
          data.set('quoteId', quoteId);
          data.set('updatedAt', updatedAt);
          data.set('status', 'lost');
          data.set('lostReason', lostReason);
          startTransition(async () => {
            await setStatus(data);
            setLostOpen(false);
            setLostReason('');
          });
        }}
      />

      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title={`Reopen ${reference}`}
        description={`${reference} goes back to reviewing so it can be priced and issued again.`}
        confirmLabel="Reopen"
        onConfirm={() => {
          const data = new FormData();
          data.set('quoteId', quoteId);
          data.set('updatedAt', updatedAt);
          startTransition(async () => {
            await reopen(data);
            setReopenOpen(false);
          });
        }}
      />

      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title={`Convert ${reference} to an order`}
        description={`${reference} will become an order with the prices already quoted. You can confirm, fulfil and mark it paid from there. Stock is not reduced.`}
        confirmLabel="Convert to order"
        onConfirm={() => {
          const data = new FormData();
          data.set('quoteId', quoteId);
          data.set('updatedAt', updatedAt);
          startTransition(async () => {
            await convert(data);
            setConvertOpen(false);
          });
        }}
      />
    </div>
  );
}
