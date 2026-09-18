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

export const dashboardSettingsSchema = z.object({
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
  brightexAllowedEmails: textList(20, 'Twenty addresses is the cap').pipe(
    z.array(z.string()).min(1, 'Keep at least one Brightex address'),
  ),
});

export type DashboardSettingsFields = z.infer<typeof dashboardSettingsSchema>;

export const setStaffGrantSchema = z.object({
  userId: z.uuid(),
  grant: z.enum(['can_read_audit']),
  enabled: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
});

export type SetStaffGrant = z.infer<typeof setStaffGrantSchema>;
