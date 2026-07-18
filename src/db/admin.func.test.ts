import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const {
  selectMock,
  selectLimitMock,
  updateMock,
  updateSetMock,
  updateWhereMock,
  updateReturningMock,
  deleteMock,
  deleteWhereMock,
  insertMock,
} = vi.hoisted(() => {
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

  const updateSetMock = vi.fn();
  const updateWhereMock = vi.fn();
  const updateReturningMock = vi.fn();
  const updateMock = vi.fn().mockReturnValue({
    set: updateSetMock.mockReturnValue({
      where: updateWhereMock.mockReturnValue({
        returning: updateReturningMock,
      }),
    }),
  });

  const deleteWhereMock = vi.fn();
  const deleteMock = vi.fn().mockReturnValue({
    where: deleteWhereMock,
  });

  const insertValuesMock = vi.fn();
  const insertReturningMock = vi.fn();
  const insertMock = vi.fn().mockReturnValue({
    values: insertValuesMock.mockReturnValue({ returning: insertReturningMock }),
  });

  return {
    selectMock,
    selectFromMock,
    selectWhereMock,
    selectLimitMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
    updateReturningMock,
    deleteMock,
    deleteWhereMock,
    insertMock,
    insertValuesMock,
    insertReturningMock,
  };
});

vi.mock('./index', () => ({
  db: {
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
    insert: insertMock,
  },
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
  clerkClient: {
    users: {
      getUserList: vi.fn(),
    },
  },
}));

vi.mock('@vercel/blob', () => ({
  del: vi.fn(),
  list: vi.fn(),
}));

import {
  checkIsAdmin,
  checkNotBanned,
  queryStorageStats,
  removeBlob,
  setUserApproved,
  setUserBanned,
} from './admin.func';

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

// ── Tests: setUserApproved ─────────────────────────────────────────────────

describe('setUserApproved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets approved to true', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 0 })]);
    updateReturningMock.mockResolvedValueOnce([{ approved: 1 }]);

    const result = await setUserApproved('user_1', true);
    expect(result).toBe(true);
    expect(updateSetMock).toHaveBeenCalledWith({ approved: 1 });
  });

  it('sets approved to false', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 0 })]);
    updateReturningMock.mockResolvedValueOnce([{ approved: 0 }]);

    const result = await setUserApproved('user_1', false);
    expect(result).toBe(false);
    expect(updateSetMock).toHaveBeenCalledWith({ approved: 0 });
  });

  it('throws when user not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(setUserApproved('user_1', true)).rejects.toThrow('User not found');
  });

  it('throws when target is an admin', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 1 })]);

    await expect(setUserApproved('user_1', true)).rejects.toThrow('Cannot modify admin users');
  });
});

// ── Tests: setUserBanned ────────────────────────────────────────────────────

describe('setUserBanned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets banned to true', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 0 })]);
    updateReturningMock.mockResolvedValueOnce([{ banned: 1 }]);

    const result = await setUserBanned('user_1', true);
    expect(result).toBe(true);
    expect(updateSetMock).toHaveBeenCalledWith({ banned: 1 });
  });

  it('sets banned to false', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 0 })]);
    updateReturningMock.mockResolvedValueOnce([{ banned: 0 }]);

    const result = await setUserBanned('user_1', false);
    expect(result).toBe(false);
    expect(updateSetMock).toHaveBeenCalledWith({ banned: 0 });
  });

  it('throws when user not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(setUserBanned('user_1', true)).rejects.toThrow('User not found');
  });

  it('throws when target is an admin', async () => {
    selectLimitMock.mockResolvedValueOnce([makeProfile({ isAdmin: 1 })]);

    await expect(setUserBanned('user_1', true)).rejects.toThrow('Cannot modify admin users');
  });
});

// ── Tests: removeBlob ───────────────────────────────────────────────────────

describe('removeBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes blob from database and Vercel Blob', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    process.env.BLOB_STORE_ID = 'test-store';

    selectLimitMock.mockResolvedValueOnce([
      {
        imageThumbnailUrl: 'https://blob.vercel/thumb.webp',
        imageMediumUrl: 'https://blob.vercel/medium.webp',
        imageFullUrl: 'https://blob.vercel/full.webp',
      },
    ]);

    const { del } = await import('@vercel/blob');

    await removeBlob(1);

    expect(del).toHaveBeenCalledWith(
      ['https://blob.vercel/thumb.webp', 'https://blob.vercel/medium.webp', 'https://blob.vercel/full.webp'],
      { token: 'test-token', storeId: 'test-store' },
    );
    expect(deleteWhereMock).toHaveBeenCalled();

    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
  });

  it('throws when blob not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(removeBlob(999)).rejects.toThrow('Blob not found');
  });
});

// ── Tests: queryStorageStats ────────────────────────────────────────────────

describe('queryStorageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stats with blob count and total size', async () => {
    const { list } = await import('@vercel/blob');
    (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blobs: [
        { size: 1024, url: 'https://blob.vercel/a.webp' },
        { size: 2048, url: 'https://blob.vercel/b.webp' },
        { size: 4096, url: 'https://blob.vercel/c.webp' },
      ],
      cursor: undefined,
    });

    const stats = await queryStorageStats();

    expect(stats.blobCount).toBe(3);
    expect(stats.totalSizeBytes).toBe(7168); // 1024 + 2048 + 4096
    expect(stats.capacityBytes).toBe(5 * 1024 * 1024 * 1024); // default 5 GB
  });

  it('handles pagination', async () => {
    const { list } = await import('@vercel/blob');
    (list as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        blobs: [{ size: 100 }, { size: 200 }],
        cursor: 'page2',
      })
      .mockResolvedValueOnce({
        blobs: [{ size: 300 }],
        cursor: undefined,
      });

    const stats = await queryStorageStats();

    expect(stats.blobCount).toBe(3);
    expect(stats.totalSizeBytes).toBe(600);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('returns zeros for empty store', async () => {
    const { list } = await import('@vercel/blob');
    (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blobs: [],
      cursor: undefined,
    });

    const stats = await queryStorageStats();

    expect(stats.blobCount).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
  });
});
