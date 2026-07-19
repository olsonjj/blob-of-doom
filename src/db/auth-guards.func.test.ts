import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { selectMock, selectLimitMock } = vi.hoisted(() => {
  const selectFromMock = vi.fn();
  const selectWhereMock = vi.fn();
  const selectLimitMock = vi.fn();
  const selectMock = vi.fn().mockReturnValue({
    from: selectFromMock.mockReturnValue({
      where: selectWhereMock.mockReturnValue({
        limit: selectLimitMock,
      }),
    }),
  });

  return { selectMock, selectLimitMock };
});

vi.mock('./index', () => ({
  db: {
    select: selectMock,
  },
}));

const { mockAuth } = vi.hoisted(() => {
  const mockAuth = vi.fn();
  return { mockAuth };
});

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: mockAuth,
}));

import { checkIsAdmin, checkNotBanned, requireAdmin } from './auth-guards.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeProfile(
  overrides: Partial<{
    clerkUserId: string;
    uploadCountToday: number;
    lastUploadDate: string | null;
    approved: number;
    banned: number;
    isAdmin: number;
    createdAt: Date;
  }> = {},
) {
  return {
    clerkUserId: overrides.clerkUserId ?? 'user_1',
    uploadCountToday: overrides.uploadCountToday ?? 0,
    lastUploadDate: overrides.lastUploadDate ?? null,
    approved: overrides.approved ?? 0,
    banned: overrides.banned ?? 0,
    isAdmin: overrides.isAdmin ?? 0,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

// ── Tests: checkIsAdmin ─────────────────────────────────────────────────────

describe('checkIsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has isAdmin = 1', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 1 })]);

    const result = await checkIsAdmin('user_1');
    expect(result).toBe(true);
  });

  it('returns false when user has isAdmin = 0', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 0 })]);

    const result = await checkIsAdmin('user_1');
    expect(result).toBe(false);
  });

  it('returns false when user has no profile', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    const result = await checkIsAdmin('user_1');
    expect(result).toBe(false);
  });
});

// ── Tests: checkNotBanned ───────────────────────────────────────────────────

describe('checkNotBanned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with profile when user is not banned', async () => {
    const profile = makeProfile({ banned: 0 });
    selectLimitMock.mockResolvedValueOnce([profile]);

    const result = await checkNotBanned('user_1');
    expect(result).toEqual(profile);
  });

  it('throws when user is banned', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ banned: 1 })]);

    await expect(checkNotBanned('user_1')).rejects.toThrow('banned');
  });

  it('throws when profile not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(checkNotBanned('user_1')).rejects.toThrow('Profile not found');
  });
});

// ── Tests: requireAdmin ─────────────────────────────────────────────────────

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns userId when user is an admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'admin_1' });
    selectLimitMock.mockResolvedValueOnce([makeProfile({ clerkUserId: 'admin_1', isAdmin: 1 })]);

    const result = await requireAdmin();
    expect(result).toBe('admin_1');
  });

  it('throws when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    await expect(requireAdmin()).rejects.toThrow('Not authenticated');
  });

  it('throws when user is not an admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_1' });
    selectLimitMock.mockResolvedValueOnce([makeProfile({ clerkUserId: 'user_1', isAdmin: 0 })]);

    await expect(requireAdmin()).rejects.toThrow('Admin access required');
  });

  it('throws when user has no profile', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_1' });
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(requireAdmin()).rejects.toThrow('Admin access required');
  });
});
