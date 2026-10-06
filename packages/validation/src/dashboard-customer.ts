import { z } from 'zod';
import { CLIENT_TYPES } from '@beco/types';
import { phoneSchema } from './quote';
import { kraPinSchema } from './dashboard-settings';

/**
 * A customer record, D130. The server's authority; the form uses the same
 * schema for its messages. Optional fields arrive from a form as '', which
 * is stored as null rather than an empty string.
 */

const emptyToNull = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

const optionalText = (max: number, message: string) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(max, message)]));

/** The phone is checked as a Kenyan number but stored as typed, trimmed. */
const customerPhone = z
  .string()
  .trim()
  .min(1, 'Enter a phone number')
  .max(40, 'That phone number is too long')
  .refine((value) => phoneSchema.safeParse(value).success, 'Enter a valid Kenyan phone number');

export const customerFieldsSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120, 'Keep the name under 120 characters'),
  phone: customerPhone,
  email: z.preprocess(emptyToNull, z.union([z.null(), z.email('Enter a valid email').max(254)])),
  company: optionalText(160, 'Keep the company under 160 characters'),
  kraPin: kraPinSchema,
  location: optionalText(300, 'Keep the location under 300 characters'),
  clientType: z.preprocess(emptyToNull, z.union([z.null(), z.enum(CLIENT_TYPES, 'Choose a client type')])),
  notes: optionalText(4000, 'Keep the notes under 4000 characters'),
});

export const createCustomerSchema = customerFieldsSchema;

export const updateCustomerSchema = customerFieldsSchema.extend({
  customerId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});

export const deleteCustomerSchema = z.object({
  customerId: z.uuid(),
});

export const linkQuoteCustomerSchema = z.object({
  quoteId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  customerId: z.uuid('Pick a customer first'),
});

export type CustomerFields = z.infer<typeof customerFieldsSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
