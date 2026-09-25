import { describe, expect, it } from 'vitest';
import {
  createStaffUserSchema,
  resetStaffPasswordSchema,
  saveStaffPublicProfileSchema,
  setStaffActiveSchema,
  setStaffRoleSchema,
  uploadStaffPhotoSchema,
} from '../dashboard-user';

describe('createStaffUserSchema', () => {
  it('accepts a Beco sales account', () => {
    const parsed = createStaffUserSchema.safeParse({
      email: '  New.Sales@Beco.co.ke ',
      fullName: 'Njeri Kamau',
      role: 'beco_sales',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe('new.sales@beco.co.ke');
  });

  it('refuses a missing name and an unknown role', () => {
    expect(createStaffUserSchema.safeParse({ email: 'a@beco.co.ke', fullName: '', role: 'beco_sales' }).success).toBe(
      false,
    );
    expect(
      createStaffUserSchema.safeParse({ email: 'a@beco.co.ke', fullName: 'A', role: 'superuser' }).success,
    ).toBe(false);
  });
});

describe('setStaffRoleSchema', () => {
  it('needs the lock token', () => {
    expect(
      setStaffRoleSchema.safeParse({
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'beco_admin',
      }).success,
    ).toBe(false);
  });
});

describe('setStaffActiveSchema', () => {
  it('reads a checkbox as true', () => {
    const parsed = setStaffActiveSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      updatedAt: '2026-09-18T10:00:00.000Z',
      isActive: 'on',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isActive).toBe(true);
  });
});

describe('resetStaffPasswordSchema', () => {
  it('needs both the id and the lock', () => {
    expect(resetStaffPasswordSchema.safeParse({ userId: '11111111-1111-4111-8111-111111111111' }).success).toBe(
      false,
    );
  });
});

describe('saveStaffPublicProfileSchema', () => {
  it('accepts an empty phone and a Kenyan mobile', () => {
    const empty = saveStaffPublicProfileSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      updatedAt: '2026-09-18T10:00:00.000Z',
      isPublic: 'on',
      publicTitle: 'Showroom',
      publicPhone: '',
    });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.publicPhone).toBeUndefined();

    const phone = saveStaffPublicProfileSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      updatedAt: '2026-09-18T10:00:00.000Z',
      isPublic: false,
      publicTitle: '',
      publicPhone: '0722 333 730',
    });
    expect(phone.success).toBe(true);
    if (phone.success) expect(phone.data.publicPhone).toBe('0722333730');
  });
});

describe('uploadStaffPhotoSchema', () => {
  it('needs alt text', () => {
    expect(
      uploadStaffPhotoSchema.safeParse({
        userId: '11111111-1111-4111-8111-111111111111',
        updatedAt: '2026-09-18T10:00:00.000Z',
        alt: 'S',
      }).success,
    ).toBe(false);
  });
});
