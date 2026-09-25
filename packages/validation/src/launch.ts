import { z } from 'zod';

/**
 * The dashboard sign in. Email and password only: no sign up, no reset flow
 * here, those belong to M5's full dashboard. This exists so the launch
 * control (D80) has a real authenticated caller rather than a shared secret
 * link, which rule 7 would not accept.
 */
export const signInSchema = z.object({
  email: z.email('Enter the email on your Beco account'),
  password: z.string().min(1, 'Enter your password'),
});

export type SignIn = z.infer<typeof signInSchema>;

/**
 * The launch settings form. The date is optional: an empty field clears it
 * back to null, which the storefront reads as "no countdown yet". A set
 * value must be a real future-or-past instant, parsed the same way
 * `new Date()` would on the storefront.
 */
export const launchSettingsSchema = z.object({
  launchAt: z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), {
      message: 'Enter a valid date and time, or leave it blank to clear it',
    })
    .transform((v) => (v === '' ? null : new Date(v).toISOString())),
});

export type LaunchSettings = z.infer<typeof launchSettingsSchema>;
