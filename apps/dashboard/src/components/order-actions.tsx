'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, useActionToast } from '@beco/ui';
import {
  markOrderPaid,
  setOrderStatus,
  type OrderActionState,
} from '@/app/(app)/orders/actions';
import type { OrderStatus, PaymentStatus } from '@beco/types';

const INITIAL: OrderActionState = {};

const Lock = ({ orderId, updatedAt }: { orderId: string; updatedAt: string }) => (
  <>
    <input type="hidden" name="orderId" value={orderId} />
    <input type="hidden" name="updatedAt" value={updatedAt} />
  </>
);

export function OrderActions({
  orderId,
  updatedAt,
  reference,
  status,
  paymentStatus,
  canMutate,
}: {
  orderId: string;
  updatedAt: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  canMutate: boolean;
}) {
  const [statusState, setStatus, setting] = useActionState(setOrderStatus, INITIAL);
  const [paidState, markPaid, paying] = useActionState(markOrderPaid, INITIAL);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const router = useRouter();
  useActionToast(statusState);
  useActionToast(paidState);

  useEffect(() => {
    if (!paidState.ok) return;
    const timer = window.setTimeout(() => router.refresh(), 100);
    return () => window.clearTimeout(timer);
  }, [paidState.ok, router]);

  if (!canMutate) {
    return <p className="font-ui text-base text-neutral-500">You can view this order. You cannot change it.</p>;
  }

  const next: { status: OrderStatus; label: string }[] = [];
  if (status === 'pending') next.push({ status: 'confirmed', label: 'Confirm' });
  if (status === 'confirmed') next.push({ status: 'fulfilled', label: 'Fulfil' });

  return (
    <div className="flex flex-col gap-2">
      {next.map((item) => (
        <form key={item.status} action={setStatus}>
          <Lock orderId={orderId} updatedAt={updatedAt} />
          <input type="hidden" name="status" value={item.status} />
          <Button type="submit" variant="outline" disabled={setting} className="h-11 w-full py-0">
            {item.label}
          </Button>
        </form>
      ))}

      {paymentStatus === 'unpaid' && status !== 'cancelled' ? (
        <Button type="button" variant="secondary" disabled={paying} className="h-11 w-full py-0" onClick={() => setPaidOpen(true)}>
          {paying ? 'Recording' : 'Mark paid'}
        </Button>
      ) : null}

      {status === 'pending' || status === 'confirmed' ? (
        <Button type="button" variant="ghost" className="h-11 w-full py-0" onClick={() => setCancelOpen(true)}>
          Cancel order
        </Button>
      ) : null}

      <ConfirmDialog
        open={paidOpen}
        onOpenChange={setPaidOpen}
        title={`Mark ${reference} paid`}
        description={`${reference} will be recorded as paid. You can view, download or email the receipt from this order.`}
        confirmLabel="Mark paid"
        onConfirm={async () => {
          setPaidOpen(false);
          const data = new FormData();
          data.set('orderId', orderId);
          data.set('updatedAt', updatedAt);
          await markPaid(data);
        }}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${reference}`}
        description={`${reference} will be cancelled. It stays on the record. This cannot be undone.`}
        confirmLabel="Cancel order"
        destructive
        onConfirm={async () => {
          setCancelOpen(false);
          const data = new FormData();
          data.set('orderId', orderId);
          data.set('updatedAt', updatedAt);
          data.set('status', 'cancelled');
          await setStatus(data);
        }}
      />
    </div>
  );
}
