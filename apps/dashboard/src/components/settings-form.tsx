'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Field,
  FormSection,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  buttonClasses,
  cn,
  useActionToast,
} from '@beco/ui';
import { saveDashboardSettings, type SettingsActionState } from '@/app/(app)/settings/actions';
import {
  emailsField,
  parseSettingsTab,
  type DashboardSettings,
  type GrantStaffRow,
  type SettingsTab,
} from '@/lib/settings';
import { PageHeading } from './page-heading';
import { SettingsGrants } from './settings-grants';

const INITIAL: SettingsActionState = {};

export function SettingsForm({
  settings,
  tab,
  canGrant,
  staff = [],
  viewerId,
}: {
  settings: DashboardSettings;
  tab: SettingsTab;
  canGrant: boolean;
  staff?: GrantStaffRow[];
  viewerId?: string;
}) {
  const [state, submit, pending] = useActionState(saveDashboardSettings, INITIAL);
  useActionToast(state);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useState(() => parseSettingsTab(tab, canGrant));

  useEffect(() => {
    setCurrent(parseSettingsTab(tab, canGrant));
  }, [tab, canGrant]);

  const setTab = (next: string) => {
    const parsed = parseSettingsTab(next, canGrant);
    setCurrent(parsed);
    const params = new URLSearchParams(searchParams.toString());
    if (parsed === 'quotes') params.delete('tab');
    else params.set('tab', parsed);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <>
      <PageHeading
        eyebrow="Operations"
        title="Settings"
        actions={
          <>
            <Button type="submit" form="settings-save" disabled={pending}>
              {pending ? 'Saving' : 'Save settings'}
            </Button>
            {canGrant ? (
              <Link href="/launch" className={cn(buttonClasses({ variant: 'outline' }))}>
                Anniversary launch
              </Link>
            ) : null}
          </>
        }
      />
      <Tabs value={current} onValueChange={setTab}>
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {canGrant ? <TabsTrigger value="studio">Studio</TabsTrigger> : null}
          {canGrant ? <TabsTrigger value="permissions">Permissions</TabsTrigger> : null}
        </TabsList>

      <form id="settings-save" action={submit} className="mt-2">
        <TabsContent value="quotes" forceMount>
          <FormSection
            columns={3}
            hint="Used the next time a quote is priced or issued. Existing PDFs stay as they were."
          >
            <Field label="VAT rate" htmlFor="settings-vat" hint="Percent">
              <Input
                id="settings-vat"
                name="vatPercent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                required
                defaultValue={settings.vatPercent}
                className="tabular-nums"
              />
            </Field>
            <Field label="Quote validity" htmlFor="settings-validity" hint="Days">
              <Input
                id="settings-validity"
                name="quoteValidityDays"
                type="number"
                min={1}
                max={365}
                required
                defaultValue={settings.quoteValidityDays}
                className="tabular-nums"
              />
            </Field>
            <Field label="Response SLA" htmlFor="settings-sla" hint="Hours">
              <Input
                id="settings-sla"
                name="quoteResponseSlaHours"
                type="number"
                min={1}
                max={72}
                required
                defaultValue={settings.quoteResponseSlaHours}
                className="tabular-nums"
              />
            </Field>
            <Field label="Payment terms" htmlFor="settings-terms" className="sm:col-span-2 xl:col-span-3">
              <Textarea id="settings-terms" name="paymentTerms" rows={3} defaultValue={settings.paymentTerms} />
            </Field>
            <Field label="Quote footer" htmlFor="settings-footer" className="sm:col-span-2 xl:col-span-3">
              <Textarea id="settings-footer" name="quoteFooter" rows={3} defaultValue={settings.quoteFooter} />
            </Field>
          </FormSection>
        </TabsContent>

        <TabsContent value="payments" forceMount>
          <FormSection
            columns={2}
            hint="Bank, till, paybill or send money. Leave a channel blank if it is not offered."
          >
            <Field label="Bank details" htmlFor="settings-bank" className="sm:col-span-2">
              <Textarea id="settings-bank" name="bankDetails" rows={3} defaultValue={settings.bankDetails} />
            </Field>
            <Field label="Till number" htmlFor="settings-till" hint="Buy Goods">
              <Input
                id="settings-till"
                name="tillNumber"
                inputMode="numeric"
                defaultValue={settings.tillNumber}
                className="tabular-nums"
              />
            </Field>
            <Field label="Send money number" htmlFor="settings-send-money" hint="Phone">
              <Input
                id="settings-send-money"
                name="sendMoneyNumber"
                inputMode="tel"
                defaultValue={settings.sendMoneyNumber}
                className="tabular-nums"
              />
            </Field>
            <Field label="Paybill number" htmlFor="settings-paybill">
              <Input
                id="settings-paybill"
                name="paybillNumber"
                inputMode="numeric"
                defaultValue={settings.paybillNumber}
                className="tabular-nums"
              />
            </Field>
            <Field label="Account" htmlFor="settings-paybill-account" hint="Optional">
              <Input id="settings-paybill-account" name="paybillAccount" defaultValue={settings.paybillAccount} />
            </Field>
          </FormSection>
        </TabsContent>

        <TabsContent value="business" forceMount>
          <FormSection
            columns={2}
            hint="Printed in the From block of every quote and receipt. KRA details appear only once filled in."
          >
            <Field label="Registered business name" htmlFor="settings-legal-name" className="sm:col-span-2">
              <Input
                id="settings-legal-name"
                name="businessLegalName"
                required
                autoComplete="organization"
                defaultValue={settings.businessLegalName}
              />
            </Field>
            <Field label="KRA PIN" htmlFor="settings-kra-pin" hint="For example P051234567X">
              <Input
                id="settings-kra-pin"
                name="kraPin"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={11}
                defaultValue={settings.kraPin}
                className="uppercase tabular-nums"
              />
            </Field>
            <Field label="VAT number" htmlFor="settings-vat-number" hint="Only if different from the PIN">
              <Input
                id="settings-vat-number"
                name="vatNumber"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                defaultValue={settings.vatNumber}
                className="uppercase tabular-nums"
              />
            </Field>
            <Field label="Business address" htmlFor="settings-address" className="sm:col-span-2">
              <Textarea
                id="settings-address"
                name="businessAddress"
                rows={2}
                required
                autoComplete="street-address"
                defaultValue={settings.businessAddress}
              />
            </Field>
            <Field label="Business email" htmlFor="settings-business-email" hint="Shown on documents">
              <Input
                id="settings-business-email"
                name="businessEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                defaultValue={settings.businessEmail}
              />
            </Field>
          </FormSection>
        </TabsContent>

        <TabsContent value="contact" forceMount>
          <FormSection columns={2}>
            <Field label="WhatsApp number" htmlFor="settings-whatsapp">
              <Input id="settings-whatsapp" name="whatsappNumber" defaultValue={settings.whatsappNumber} />
            </Field>
            <Field label="Business phone" htmlFor="settings-phone">
              <Input id="settings-phone" name="businessPhone" defaultValue={settings.businessPhone} />
            </Field>
          </FormSection>
        </TabsContent>

        <TabsContent value="notifications" forceMount>
          <FormSection columns={2} hint="Who is emailed when a website quote lands. One address per line.">
            <Field label="Notification recipients" htmlFor="settings-notify">
              <Textarea
                id="settings-notify"
                name="notificationRecipients"
                rows={6}
                defaultValue={emailsField(settings.notificationRecipients)}
              />
            </Field>
          </FormSection>
        </TabsContent>

        <TabsContent value="studio" forceMount>
          <FormSection columns={2} hint="Explicit addresses, not a domain. Brightex's real mail is Gmail.">
            <Field label="Brightex allowed emails" htmlFor="settings-allowlist">
              <Textarea
                id="settings-allowlist"
                name="brightexAllowedEmails"
                rows={6}
                required
                defaultValue={emailsField(settings.brightexAllowedEmails)}
              />
            </Field>
          </FormSection>
        </TabsContent>
      </form>

      {canGrant && viewerId ? (
        <TabsContent value="permissions">
          <SettingsGrants staff={staff} viewerId={viewerId} />
        </TabsContent>
      ) : null}
    </Tabs>
    </>
  );
}
