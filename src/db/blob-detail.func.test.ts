import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { selectMock, selectLimitMock, updateMock, updateReturningMock } = vi.hoisted(
  () => {
    const selectGroupByMock = vi.fn();
    const selectWhereMock = vi.fn().mockReturnValue({ groupBy: selectGroupByMock });
    const selectLeftJoinMock = vi.fn().mockReturnValue({ where: selectWhereMock });
    const selectFromMock = vi.fn().mockReturnValue({ leftJoin: selectLeftJoinMock });
    const selectMock = vi.fn().mockReturnValue({ from: selectFromMock });

    // queryBlobDetail also calls .limit(1) after .groupBy()
    const selectLimitMock = vi.fn();
    // Default: groupBy returns { limit: selectLimitMock }
    selectGroupByMock.mockReturnValue({ limit: selectLimitMock });

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
      selectGroupByMock,
      selectLimitMock,
      updateMock,
      updateSetMock,
      updateWhereMock,
      updateReturningMock,
    };
  },
);

vi.mock('./index', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import { incrementViewCount, queryBlobDetail } from './blob-detail.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBlobRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test Blob',
    description: overrides.description ?? null,
    dateOccurred: overrides.dateOccurred ?? '2025-01-01',
    filamentType: overrides.filamentType ?? 'PLA',
    machineUsed: overrides.machineUsed ?? 'Ender 3',
    imageThumbnailUrl: overrides.imageThumbnailUrl ?? 'https://blob.vercel/thumb.webp',
    imageMediumUrl: overrides.imageMediumUrl ?? 'https://blob.vercel/medium.webp',
    imageFullUrl: overrides.imageFullUrl ?? 'https://blob.vercel/full.webp',
    uploaderProfileId: overrides.uploaderProfileId ?? 'user_1',
    viewCount: overrides.viewCount ?? 0,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    averageRating: overrides.averageRating ?? 0,
    ratingCount: overrides.ratingCount ?? 0,
    userRating: 'userRating' in overrides ? overrides.userRating : null,
  };
}

// ── Tests: queryBlobDetail ──────────────────────────────────────────────────

describe('queryBlobDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns blob detail when found', async () => {
    const row = makeBlobRow({ id: 42, title: 'Spaghetti Monster', averageRating: 3.5, ratingCount: 2 });
    selectLimitMock.mockResolvedValueOnce([row]);

    const result = await queryBlobDetail(42);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(42);
    expect(result!.title).toBe('Spaghetti Monster');
    expect(result!.averageRating).toBe(3.5);
    expect(result!.ratingCount).toBe(2);
    expect(result!.userRating).toBeNull();
  });

  it('returns null when blob not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    const result = await queryBlobDetail(999);
    expect(result).toBeNull();
  });

  it('includes userRating when userId is provided', async () => {
    const row = makeBlobRow({ userRating: 4 });
    selectLimitMock.mockResolvedValueOnce([row]);

    const result = await queryBlobDetail(1, 'user_1');
    expect(result!.userRating).toBe(4);
  });

  it('returns null userRating when userId is not provided', async () => {
    const row = makeBlobRow({ userRating: null });
    selectLimitMock.mockResolvedValueOnce([row]);

    const result = await queryBlobDetail(1);
    expect(result!.userRating).toBeNull();
  });

  it('returns 0 averageRating and 0 ratingCount for unrated blob', async () => {
    const row = makeBlobRow({ averageRating: 0, ratingCount: 0 });
    selectLimitMock.mockResolvedValueOnce([row]);

    const result = await queryBlobDetail(1);
    expect(result!.averageRating).toBe(0);
    expect(result!.ratingCount).toBe(0);
  });
});

// ── Tests: incrementViewCount ───────────────────────────────────────────────

describe('incrementViewCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the new view count after incrementing', async () => {
    updateReturningMock.mockResolvedValueOnce([{ viewCount: 6 }]);

    const result = await incrementViewCount(1);
    expect(result).toBe(6);
  });

  it('returns 0 when blob not found', async () => {
    updateReturningMock.mockResolvedValueOnce([]);

    const result = await incrementViewCount(999);
    expect(result).toBe(0);
  });

  it('increments from 0 to 1 on first view', async () => {
    updateReturningMock.mockResolvedValueOnce([{ viewCount: 1 }]);

    const result = await incrementViewCount(1);
    expect(result).toBe(1);
  });
});
