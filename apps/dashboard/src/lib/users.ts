import { randomBytes } from 'node:crypto';
import type { UserRole } from '@beco/types';
import { USER_ROLES } from '@beco/types';
import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export const STAFF_ROLE_LABEL: Record<UserRole, string> = {
  beco_admin: 'Beco admin',
  beco_sales: 'Sales',
  beco_product_manager: 'Product manager',
  beco_editor: 'Editor',
  brightex_admin: 'Brightex admin',
};

export const STAFF_ROLES: readonly UserRole[] = USER_ROLES;

export interface StaffPublicPhoto {
  path: string;
  alt: string;
  width: number;
  height: number;
  blur?: string;
}

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  isPublic: boolean;
  publicTitle: string | null;
  publicPhone: string | null;
  publicPhoto: StaffPublicPhoto | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const staffPhotoUrl = (path: string, width: 400 | 800 | 1600 = 400): string => {
  const host = (process.env.NEXT_PUBLIC_IMAGE_HOST ?? '').replace(/\/$/, '');
  return `${host}/${path}-${width}.webp`;
};

export const parseStaffPublicPhoto = (value: unknown): StaffPublicPhoto | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.path !== 'string' || rec.path.length < 3) return null;
  const photo: StaffPublicPhoto = {
    path: rec.path,
    alt: typeof rec.alt === 'string' ? rec.alt : '',
    width: Number(rec.width) || 0,
    height: Number(rec.height) || 0,
  };
  if (typeof rec.blur === 'string') photo.blur = rec.blur;
  return photo;
};

export interface StaffUserFilters {
  search?: string | undefined;
  role?: UserRole | undefined;
  status?: 'active' | 'inactive' | undefined;
}

const sanitizeSearchTerm = (term: string): string => term.replace(/[,()]/g, '').trim();

export const generateIssuedPassword = (): string => randomBytes(18).toString('base64url');

export const formatLastLogin = (iso: string | null): string => {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
    hourCycle: 'h23',
  });
};

export const userMutationMessage = (
  // AuthError types `code` as including `| undefined` explicitly, not only via the
  // optional modifier, so the param needs the same shape under exactOptionalPropertyTypes.
  error: { message?: string | undefined; code?: string | undefined } | null | undefined,
): string => {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === '23505' || /already registered|duplicate key|users_email/i.test(message)) {
    return 'That email already has an account.';
  }
  if (/cannot change your own role/i.test(message)) return 'You cannot change your own role.';
  if (/cannot deactivate your own/i.test(message)) return 'You cannot deactivate your own account.';
  if (/last active admin/i.test(message)) {
    return 'That is the last active admin of that role. Create another first.';
  }
  if (code === '23514' || /users_only_sales_are_public/i.test(message)) {
    return 'Only sales accounts can appear on the website.';
  }
  if (code === '42501' || /not allowed/i.test(message)) {
    return 'You do not have permission to change users.';
  }
  if (message) return message;
  return 'The database refused that write.';
};

const STAFF_COLUMNS =
  'id, email, full_name, role, is_active, is_public, public_title, public_phone, public_photo, must_change_password, last_login_at, created_at, updated_at';

const toStaff = (row: {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_public: boolean;
  public_title: string | null;
  public_phone: string | null;
  public_photo: unknown;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}): StaffUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  isActive: row.is_active,
  isPublic: row.is_public,
  publicTitle: row.public_title,
  publicPhone: row.public_phone,
  publicPhoto: parseStaffPublicPhoto(row.public_photo),
  mustChangePassword: row.must_change_password,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchUsers(
  supabase: SupabaseClient,
  filters: StaffUserFilters = {},
): Promise<StaffUser[]> {
  let query = supabase
    .from('users')
    .select(STAFF_COLUMNS)
    .order('full_name')
    .limit(400);

  const term = filters.search ? sanitizeSearchTerm(filters.search) : '';
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (filters.role) query = query.eq('role', filters.role);
  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return (data ?? []).map(toStaff);
}

export async function fetchUserById(supabase: SupabaseClient, id: string): Promise<StaffUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select(STAFF_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load that user: ${error.message}`);
  return data ? toStaff(data) : null;
}
