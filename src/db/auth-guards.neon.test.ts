/**
 * Neon HTTP-level tests for auth guards (checkIsAdmin, checkNotBanned, requireAdmin).
 *
 * These tests mock at the @neondatabase/serverless boundary so the real
 * Drizzle query builder runs. This catches regressions when Drizzle APIs
 * or query patterns change, unlike the fluent-chain mocks in the sibling
 * .func.test.ts file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted neon mock (must be at top level for vi.mock hoisting) ───────────
const { mockQueryFn } = vi.hoisted(() => {
  const q = vi.fn();
  return {
    mockQueryFn: Object.assign(q, {
      query: vi.fn(),
      unsafe: vi.fn(),
      transaction: vi.fn(),
    }),
  };
});

vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockQueryFn,
}));

// Dynamic import of Clerk auth
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: mockAuth,
}));

// Now safe to import — the db module will use our mocked neon
import { checkIsAdmin, checkNotBanned, requireAdmin } from './auth-guards.func';
import { ADMIN_CHECK_COLUMNS, emptySelectResult, oneProfileRow, selectArrayResult } from './test-helpers';

// ── Helpers ─────────────────────────────────────────────────────────────────

function queueAdminCheck(isAdmin: number) {
  mockQueryFn.query.mockResolvedValueOnce(selectArrayResult([[isAdmin]], ADMIN_CHECK_COLUMNS));
}

// ── Tests: checkIsAdmin ─────────────────────────────────────────────────────

describe('checkIsAdmin (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has is_admin = 1', async () => {
    queueAdminCheck(1);
    expect(await checkIsAdmin('user_1')).toBe(true);
  });

  it('returns false when user has is_admin = 0', async () => {
    queueAdminCheck(0);
    expect(await checkIsAdmin('user_1')).toBe(false);
  });

  it('returns false when user has no profile', async () => {
    mockQueryFn.query.mockResolvedValueOnce(emptySelectResult(ADMIN_CHECK_COLUMNS));
    expect(await checkIsAdmin('user_1')).toBe(false);
  });

  it('queries the profiles table with the correct userId', async () => {
    queueAdminCheck(1);
    await checkIsAdmin('user_specific');

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('profiles');
    expect(sql).toContain('clerk_user_id');
    // Params: [userId, limit]
    expect(mockQueryFn.query.mock.calls[0][1]).toEqual(['user_specific', 1]);
  });
});

// ── Tests: checkNotBanned ───────────────────────────────────────────────────

describe('checkNotBanned (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with profile when user is not banned', async () => {
    mockQueryFn.query.mockResolvedValueOnce(oneProfileRow({ banned: 0 }));

    const result = await checkNotBanned('user_1');
    expect(result).toBeDefined();
    expect(result.banned).toBe(0);
  });

  it('throws when user is banned', async () => {
    mockQueryFn.query.mockResolvedValueOnce(oneProfileRow({ banned: 1 }));

    await expect(checkNotBanned('user_1')).rejects.toThrow('banned');
  });

  it('throws when profile not found', async () => {
    mockQueryFn.query.mockResolvedValueOnce(
      emptySelectResult([
        'clerk_user_id',
        'upload_count_today',
        'last_upload_date',
        'approved',
        'banned',
        'is_admin',
        'created_at',
      ]),
    );

    await expect(checkNotBanned('user_1')).rejects.toThrow('Profile not found');
  });

  it('queries the profiles table for the correct user', async () => {
    mockQueryFn.query.mockResolvedValueOnce(oneProfileRow());

    await checkNotBanned('user_2');

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('profiles');
    expect(mockQueryFn.query.mock.calls[0][1]).toEqual(['user_2', 1]);
  });
});

// ── Tests: requireAdmin ─────────────────────────────────────────────────────

describe('requireAdmin (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns userId when user is an admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'admin_1' });
    queueAdminCheck(1);

    expect(await requireAdmin()).toBe('admin_1');
  });

  it('throws when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    await expect(requireAdmin()).rejects.toThrow('Not authenticated');
  });

  it('throws when user is authenticated but not an admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_1' });
    queueAdminCheck(0);

    await expect(requireAdmin()).rejects.toThrow('Admin access required');
  });

  it('throws when user has no profile', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_1' });
    mockQueryFn.query.mockResolvedValueOnce(emptySelectResult(ADMIN_CHECK_COLUMNS));

    await expect(requireAdmin()).rejects.toThrow('Admin access required');
  });

  it('calls auth() then queries profiles', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'admin_1' });
    queueAdminCheck(1);

    await requireAdmin();

    expect(mockAuth).toHaveBeenCalledOnce();
    expect(mockQueryFn.query).toHaveBeenCalledOnce();
    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('profiles');
    expect(sql).toContain('is_admin');
  });
});
