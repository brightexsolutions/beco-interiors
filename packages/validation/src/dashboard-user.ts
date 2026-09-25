import { z } from 'zod';
import { USER_ROLES } from '@beco/types';
import { phoneSchema } from './quote';

const staffEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Need a real email address')
  .max(160);

const fullName = z.string().trim().min(2, 'Name the person').max(80);

export const createStaffUserSchema = z.object({
  email: staffEmail,
  fullName,
  role: z.enum(USER_ROLES),
});

export const setStaffRoleSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  role: z.enum(USER_ROLES),
});

export const setStaffActiveSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  isActive: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
});

export const resetStaffPasswordSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});

const optionalKenyanPhone = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? undefined : value;
}, phoneSchema.optional());

export const saveStaffPublicProfileSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  isPublic: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
  publicTitle: z.string().trim().max(80).optional(),
  publicPhone: optionalKenyanPhone,
});

export const uploadStaffPhotoSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
  alt: z.string().trim().min(2, 'Describe the photograph').max(180),
});

export const removeStaffPhotoSchema = z.object({
  userId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});

export type CreateStaffUser = z.infer<typeof createStaffUserSchema>;
