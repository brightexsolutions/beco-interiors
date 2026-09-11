import { z } from 'zod';

/**
 * The forced first-login password change, and the same screen used for a
 * voluntary change later. Server-side authority per rule 7: the dashboard
 * action re-parses this before it calls Supabase Auth, whatever the client
 * did.
 *
 * The floor is 10 characters. This is a staff tool, the issued password is
 * short-lived by design (see D80 and ARCHITECTURE section 11), and the whole
 * point of the screen is to replace a weak issued secret with a real one.
 * No composition rules beyond length: length beats a character-class rule a
 * user games with `Password1!`.
 */
export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(72, 'Keep it under 72 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The two passwords do not match',
  });

export type ChangePassword = z.infer<typeof changePasswordSchema>;
