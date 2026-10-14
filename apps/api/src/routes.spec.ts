import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminController, AuthController, DataController } from './routes';
import { AuthGuard, AdminGuard, tokenFor } from './security';
import bcrypt from 'bcryptjs';

describe('authorization', () => {
  beforeEach(() => {
    process.env.JWT_SECRET =
      'a-test-secret-with-more-than-thirty-two-characters';
  });
  it('rejects missing bearer tokens', async () => {
    const guard = new AuthGuard({ employee: { findUnique: vi.fn() } } as never);
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never),
    ).rejects.toThrow();
  });
  it('rejects employee access to admin routes', async () => {
    const guard = new AdminGuard({
      employee: { findUnique: vi.fn() },
    } as never);
    const headers = {
      authorization: `Bearer ${tokenFor({ id: 'employee', role: 'EMPLOYEE' })}`,
    };
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      } as never),
    ).rejects.toThrow();
  });
  it('rejects a stale admin token after role revocation', async () => {
    const guard = new AdminGuard({
      employee: { findUnique: vi.fn().mockResolvedValue({ role: 'EMPLOYEE' }) },
    } as never);
    const headers = {
      authorization: `Bearer ${tokenFor({ id: 'former-admin', role: 'ADMIN' })}`,
    };
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      } as never),
    ).rejects.toThrow();
  });
});

describe('employee content', () => {
  it('hides celebrations when the employee opted out', async () => {
    const s = {
      db: {
        celebration: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'a', employeeId: 'visible' },
            { id: 'b', employeeId: 'hidden' },
          ]),
        },
        employee: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'visible', name: 'Visible' }]),
        },
      },
    };
    const result = await new DataController(s as never).celebrations();
    expect(result.map((x) => x.id)).toEqual(['a']);
    expect(s.db.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['visible', 'hidden'] }, publicCelebrations: true },
      }),
    );
  });
  it('only queries published posts', async () => {
    const findMany = vi.fn().mockResolvedValue([]),
      count = vi.fn().mockResolvedValue(0);
    const controller = new DataController({
      db: { post: { findMany, count } },
    } as never);
    await controller.posts({ search: 'hello', take: '999' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ published: true }),
        take: 40,
      }),
    );
  });
  it('strips markup and attributes post to authenticated employee', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'post' });
    const controller = new DataController({
      throttle: vi.fn(),
      db: { post: { create } },
    } as never);
    await controller.createPost(
      { id: 'alex', role: 'EMPLOYEE' },
      {
        title: 'Hello <b>team</b>',
        body: 'This is a <script>test</script> post',
        category: 'DISCUSSION',
      },
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: 'alex',
          title: 'Hello team',
          body: 'This is a test post',
        }),
      }),
    );
  });
  it('hides birthday celebrations when date sharing is disabled', async () => {
    const s = {
      db: {
        celebration: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'birthday', employeeId: 'a', kind: 'BIRTHDAY' },
            { id: 'award', employeeId: 'a', kind: 'ACHIEVEMENT' },
          ]),
        },
        employee: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: 'a', name: 'Alex', showBirthday: false },
            ]),
        },
      },
    };
    const result = await new DataController(s as never).celebrations();
    expect(result.map((x) => x.id)).toEqual(['award']);
  });
  it('stores a validated employee photo under their own id', async () => {
    const update = vi.fn().mockResolvedValue({
      publicId: 'employee/10000000001',
      avatarUrl: '/api/inside/people/employee/10000000001/avatar',
    });
    const putObject = vi.fn().mockResolvedValue(undefined);
    const controller = new AuthController({
      bucket: 'inside-assets',
      bucketReady: vi.fn(),
      minio: { putObject },
      db: {
        employee: {
          update,
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({ publicId: 'employee/10000000001' }),
        },
      },
    } as never);
    const buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
    await controller.avatar({ id: 'alex', role: 'EMPLOYEE' }, {
      mimetype: 'image/png',
      buffer,
      size: buffer.length,
    } as never);
    expect(putObject).toHaveBeenCalledWith(
      'inside-assets',
      'avatars/alex',
      buffer,
      buffer.length,
      { 'Content-Type': 'image/png' },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'alex' } }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { avatarUrl: '/api/inside/people/employee/10000000001/avatar' },
      }),
    );
  });
  it('rejects a client-assigned employee public ID', async () => {
    const create = vi.fn();
    const controller = new AdminController({
      db: { employee: { create } },
    } as never);
    await expect(
      controller.person(
        { id: 'admin', role: 'ADMIN' },
        {
          publicId: 'employee/99999999999',
          name: 'Test Person',
          email: 'test@example.test',
          password: 'long-password',
          title: 'Engineer',
          team: 'Platform',
          unitId: 'unit',
          location: 'Remote',
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
      ),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('looks up profiles by public ID without returning internal identifiers', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      publicId: 'employee/10000000001',
      name: 'Test Person',
    });
    const result = await new DataController({
      db: { employee: { findUnique } },
    } as never).person('10000000001');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { publicId: 'employee/10000000001' } }),
    );
    expect(result).not.toHaveProperty('id');
    await expect(
      new DataController({ db: { employee: { findUnique } } } as never).person(
        'not-a-number',
      ),
    ).rejects.toThrow();
  });
  it('changes a password only after verifying the current one', async () => {
    const passwordHash = await bcrypt.hash('CurrentPassword123', 4);
    const update = vi.fn().mockResolvedValue({});
    const controller = new AuthController({
      db: {
        employee: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ passwordHash }),
          update,
        },
      },
    } as never);
    await expect(
      controller.password(
        { id: 'alex', role: 'EMPLOYEE' },
        { currentPassword: 'wrong', newPassword: 'NewPassword123' },
      ),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
    await controller.password(
      { id: 'alex', role: 'EMPLOYEE' },
      { currentPassword: 'CurrentPassword123', newPassword: 'NewPassword123' },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'alex' },
        data: { passwordHash: expect.any(String) },
      }),
    );
  });
});
