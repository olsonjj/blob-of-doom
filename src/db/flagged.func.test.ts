import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { selectMock, selectOrderByMock, updateMock, updateSetMock, updateReturningMock } = vi.hoisted(() => {
  const selectOrderByMock = vi.fn();
  const selectInnerJoinMock = vi.fn();
  const selectWhereMock = vi.fn().mockReturnValue({
    orderBy: selectOrderByMock,
  });
  const selectFromMock = vi.fn().mockReturnValue({
    innerJoin: selectInnerJoinMock.mockReturnValue({
      where: selectWhereMock,
    }),
  });
  const selectMock = vi.fn().mockReturnValue({
    from: selectFromMock,
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

  return {
    selectMock,
    selectOrderByMock,
    updateMock,
    updateSetMock,
    updateReturningMock,
  };
});

vi.mock('./index', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  clerkClient: vi.fn(() => ({
    users: {
      getUserList: vi.fn(),
    },
  })),
}));

import { approveFlaggedBlobById, queryFlaggedBlobs } from './admin.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFlaggedRow(
  overrides: Partial<{
    id: number;
    title: string;
    description: string | null;
    dateOccurred: string;
    filamentType: string;
    machineUsed: string;
    imageThumbnailUrl: string;
    uploaderProfileId: string;
    moderationScores: Record<string, number> | null;
    createdAt: Date;
    clerkUserId: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test Blob',
    description: overrides.description ?? null,
    dateOccurred: overrides.dateOccurred ?? '2025-01-01',
    filamentType: overrides.filamentType ?? 'PLA',
    machineUsed: overrides.machineUsed ?? 'Ender 3',
    imageThumbnailUrl: overrides.imageThumbnailUrl ?? 'https://blob.vercel/thumb.webp',
    uploaderProfileId: overrides.uploaderProfileId ?? 'user_1',
    moderationScores: 'moderationScores' in overrides ? overrides.moderationScores : { nudity: 0.8, weapons: 0.1 },
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    clerkUserId: overrides.clerkUserId ?? 'user_1',
  };
}

// ── Tests: queryFlaggedBlobs ────────────────────────────────────────────────

describe('queryFlaggedBlobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no flagged blobs', async () => {
    selectOrderByMock.mockResolvedValueOnce([]);

    const result = await queryFlaggedBlobs();
    expect(result).toEqual([]);
  });

  it('returns flagged blobs enriched with Clerk user data', async () => {
    selectOrderByMock.mockResolvedValueOnce([
      makeFlaggedRow({ id: 1, title: 'Bad Blob', clerkUserId: 'user_1' }),
      makeFlaggedRow({ id: 2, title: 'Sketchy Print', clerkUserId: 'user_2' }),
    ]);

    const { clerkClient } = await import('@clerk/tanstack-react-start/server');
    const mockGetUserList = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'user_1',
          firstName: 'Alice',
          lastName: 'Smith',
          username: null,
          imageUrl: 'https://img.clerk/avatar1.jpg',
        },
        {
          id: 'user_2',
          firstName: null,
          lastName: null,
          username: 'bob42',
          imageUrl: 'https://img.clerk/avatar2.jpg',
        },
      ],
    });
    (clerkClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      users: { getUserList: mockGetUserList },
    });

    const result = await queryFlaggedBlobs();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 1,
      title: 'Bad Blob',
      uploaderName: 'Alice Smith',
      uploaderAvatarUrl: 'https://img.clerk/avatar1.jpg',
      moderationScores: { nudity: 0.8, weapons: 0.1 },
    });
    expect(result[1]).toMatchObject({
      id: 2,
      title: 'Sketchy Print',
      uploaderName: 'bob42',
      uploaderAvatarUrl: 'https://img.clerk/avatar2.jpg',
    });
  });

  it('falls back to "Unknown" when Clerk user not found', async () => {
    selectOrderByMock.mockResolvedValueOnce([makeFlaggedRow({ id: 1, clerkUserId: 'user_missing' })]);

    const { clerkClient } = await import('@clerk/tanstack-react-start/server');
    const mockGetUserList = vi.fn().mockResolvedValueOnce({ data: [] });
    (clerkClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      users: { getUserList: mockGetUserList },
    });

    const result = await queryFlaggedBlobs();

    expect(result).toHaveLength(1);
    expect(result[0].uploaderName).toBe('Unknown');
    expect(result[0].uploaderAvatarUrl).toBe('');
  });

  it('handles null moderation scores', async () => {
    selectOrderByMock.mockResolvedValueOnce([makeFlaggedRow({ id: 1, moderationScores: null })]);

    const { clerkClient } = await import('@clerk/tanstack-react-start/server');
    const mockGetUserList = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'user_1',
          firstName: 'Alice',
          lastName: null,
          username: null,
          imageUrl: '',
        },
      ],
    });
    (clerkClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      users: { getUserList: mockGetUserList },
    });

    const result = await queryFlaggedBlobs();

    expect(result).toHaveLength(1);
    expect(result[0].moderationScores).toBeNull();
  });
});

// ── Tests: approveFlaggedBlobById ───────────────────────────────────────────

describe('approveFlaggedBlobById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets flagged to 0 and clears moderation scores', async () => {
    updateReturningMock.mockResolvedValueOnce([{ id: 1 }]);

    await approveFlaggedBlobById(1);

    expect(updateSetMock).toHaveBeenCalledWith({
      flagged: 0,
      moderationScores: null,
    });
  });

  it('throws when blob not found', async () => {
    updateReturningMock.mockResolvedValueOnce([]);

    await expect(approveFlaggedBlobById(999)).rejects.toThrow('Blob not found');
  });
});
