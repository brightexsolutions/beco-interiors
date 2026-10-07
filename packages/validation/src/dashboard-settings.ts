import { z } from 'zod';

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalDigits = (min: number, max: number, message: string) =>
  z.preprocess((value) => {
    if (value === '' || value == null) return null;
    const digits = String(value).replace(/[^\d]/g, '');
    return digits === '' ? null : digits;
  }, z.union([z.null(), z.string().min(min, message).max(max, message)]));

const textList = (maxItems: number, message: string) =>
  z
    .string()
    .transform((value) =>
      [...new Set(value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))],
    )
    .pipe(z.array(z.string().email('Need a real email address').max(120)).max(maxItems, message));

/** KRA PIN: a letter, nine digits, a letter, e.g. P051234567X. Optional, so
 *  documents can go out before Beco supplies it, and uppercased on save.
 *  Shared with the customer record (D130), so both PINs keep one shape. */
export const kraPinSchema = z.preprocess(
  (value) => (value === '' || value == null ? null : String(value).replace(/\s+/g, '').toUpperCase()),
  z.union([z.null(), z.string().regex(/^[A-Z]\d{9}[A-Z]$/, 'A KRA PIN is a letter, nine digits and a letter')]),
);

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(max)]));

export const dashboardSettingsSchema = z.object({
  businessLegalName: z.string().trim().min(2, 'Need the registered business name').max(120),
  kraPin: kraPinSchema,
  vatNumber: z.preprocess(
    (value) => (value === '' || value == null ? null : String(value).trim().toUpperCase()),
    z.union([z.null(), z.string().regex(/^[A-Z0-9-]{4,20}$/, 'A VAT number is letters and digits only')]),
  ),
  businessAddress: z.string().trim().min(5, 'Need the business address').max(200),
  businessEmail: z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().email('Need a real email address').max(120)])),
  vatPercent: z.coerce.number().min(0, 'VAT cannot be negative').max(100, 'VAT cannot exceed 100 percent'),
  quoteValidityDays: z.coerce.number().int().min(1, 'Validity is at least one day').max(365, 'Validity cannot exceed a year'),
  quoteResponseSlaHours: z.coerce.number().int().min(1, 'SLA is at least one hour').max(72, 'SLA cannot exceed 72 hours'),
  bankDetails: z.string().trim().max(400),
  tillNumber: optionalDigits(5, 20, 'Need a real till number'),
  paybillNumber: optionalDigits(5, 20, 'Need a real paybill number'),
  paybillAccount: z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(80)])),
  sendMoneyNumber: optionalDigits(9, 15, 'Need a real send-money number'),
  paymentTerms: z.string().trim().max(400),
  quoteFooter: z.string().trim().max(400),
  whatsappNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^\d]/g, ''))
    .pipe(z.string().min(10, 'Need a WhatsApp number').max(15, 'That WhatsApp number is too long')),
  businessPhone: z.string().trim().min(8, 'Need the business line').max(24),
  notificationRecipients: textList(20, 'Twenty recipients is the cap'),
  // Brightex's own gate (D42). Only a brightex_admin submits it; a Beco
  // admin's save leaves it out, and the stored list stands (D110).
  brightexAllowedEmails: textList(20, 'Twenty addresses is the cap')
    .pipe(z.array(z.string()).min(1, 'Keep at least one Brightex address'))
    .optional(),
});

export type DashboardSettingsFields = z.infer<typeof dashboardSettingsSchema>;

export const setStaffGrantSchema = z.object({
  userId: z.uuid(),
  grant: z.enum(['can_read_audit', 'can_manage_users']),
  enabled: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
});

export type SetStaffGrant = z.infer<typeof setStaffGrantSchema>;
