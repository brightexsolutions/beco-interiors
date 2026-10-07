import { Field, FormSection, Input, Select, Textarea } from '@beco/ui';
import { CLIENT_TYPES } from '@beco/types';
import { CLIENT_TYPE_LABEL } from '@/lib/customer-search';
import type { CustomerRecord } from '@/lib/customer-records';

export type CustomerFieldValues = Pick<
  CustomerRecord,
  'name' | 'phone' | 'email' | 'company' | 'kraPin' | 'location' | 'clientType' | 'notes'
>;

/**
 * The customer's fields, once, for the New customer form, the Add new client
 * form on a quote and the customer's own page (D130). Uncontrolled: the
 * form posts them and the server validates, so the same names reach the
 * same zod schema from every place. `error` and `field` put a server
 * refusal under the input it belongs to.
 */
export function CustomerFields({
  idPrefix,
  values,
  error,
  field,
  disabled = false,
}: {
  idPrefix: string;
  values?: Partial<CustomerFieldValues> | undefined;
  error?: string | undefined;
  field?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const errorFor = (name: string) => (field === name ? error : undefined);
  return (
    <>
      <FormSection title="Contact">
        <Field label="Name" htmlFor={id('name')} error={errorFor('name')}>
          <Input
            id={id('name')}
            name="name"
            required
            autoComplete="off"
            autoCapitalize="words"
            defaultValue={values?.name ?? ''}
            disabled={disabled}
          />
        </Field>
        <Field label="Phone" htmlFor={id('phone')} hint="07.. or +254" error={errorFor('phone')}>
          <Input
            id={id('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="off"
            defaultValue={values?.phone ?? ''}
            disabled={disabled}
          />
        </Field>
        <Field label="Email" htmlFor={id('email')} hint="Optional" error={errorFor('email')}>
          <Input
            id={id('email')}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            defaultValue={values?.email ?? ''}
            disabled={disabled}
          />
        </Field>
      </FormSection>
      <FormSection title="Business">
        <Field label="Company" htmlFor={id('company')} hint="Optional" error={errorFor('company')}>
          <Input id={id('company')} name="company" autoComplete="off" defaultValue={values?.company ?? ''} disabled={disabled} />
        </Field>
        <Field label="KRA PIN" htmlFor={id('kraPin')} hint="A123456789Z" error={errorFor('kraPin')}>
          <Input
            id={id('kraPin')}
            name="kraPin"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={values?.kraPin ?? ''}
            disabled={disabled}
          />
        </Field>
        <Field label="Client type" htmlFor={id('clientType')} hint="Optional" error={errorFor('clientType')}>
          <Select id={id('clientType')} name="clientType" defaultValue={values?.clientType ?? ''} disabled={disabled}>
            <option value="">Not set</option>
            {CLIENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CLIENT_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" htmlFor={id('location')} hint="Area or delivery address" error={errorFor('location')}>
          <Input id={id('location')} name="location" autoComplete="off" defaultValue={values?.location ?? ''} disabled={disabled} />
        </Field>
      </FormSection>
      <FormSection title="Notes" hint="Staff only. Never printed.">
        <Field label="Notes" htmlFor={id('notes')} error={errorFor('notes')} className="[&>label]:sr-only">
          <Textarea id={id('notes')} name="notes" rows={4} defaultValue={values?.notes ?? ''} disabled={disabled} />
        </Field>
      </FormSection>
    </>
  );
}
