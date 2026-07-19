import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ratings } from './schema';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { insertValuesMock, insertOnConflictMock, insertReturningMock, insertMock, selectWhereMock, selectLimitMock, selectMock } =
  vi.hoisted(() => {
    const insertValuesMock = vi.fn();
    const insertOnConflictMock = vi.fn();
    const insertReturningMock = vi.fn();
    const insertMock = vi.fn().mockReturnValue({
      values: insertValuesMock.mockReturnValue({
        onConflictDoUpdate: insertOnConflictMock.mockReturnValue({
          returning: insertReturningMock,
        }),
      }),
    });

    const selectFromMock = vi.fn();
    const selectWhereMock = vi.fn();
    const selectLimitMock = vi.fn();
    // Default: where() returns { limit: selectLimitMock }
    selectWhereMock.mockReturnValue({ limit: selectLimitMock });
    const selectMock = vi.fn().mockReturnValue({
      from: selectFromMock.mockReturnValue({
        where: selectWhereMock,
      }),
    });

    return {
      insertValuesMock,
      insertOnConflictMock,
      insertReturningMock,
      insertMock,
      selectFromMock,
      selectWhereMock,
      selectLimitMock,
      selectMock,
    };
  });

vi.mock('./index', () => ({
  db: {
    insert: insertMock,
    select: selectMock,
  },
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}));

import { calculateAverage, checkBlobVisible, upsertRating, validateRatingInput } from './rating.func';

// ── Tests: validateRatingInput ──────────────────────────────────────────────

describe('validateRatingInput', () => {
  it('returns clean data for valid input', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 3 });
    expect(error).toBeNull();
    expect(data).toEqual({ blobId: 1, score: 3 });
  });

  it('rejects non-object input', () => {
    expect(validateRatingInput(null).error).toBe('Invalid input');
    expect(validateRatingInput(undefined).error).toBe('Invalid input');
    expect(validateRatingInput('foo').error).toBe('Invalid input');
    expect(validateRatingInput(42).error).toBe('Invalid input');
  });

  it('rejects missing blobId', () => {
    const { data, error } = validateRatingInput({ score: 3 });
    expect(data).toBeNull();
    expect(error).toBe('Invalid blob ID');
  });

  it('rejects non-integer blobId', () => {
    const { data, error } = validateRatingInput({ blobId: 1.5, score: 3 });
    expect(data).toBeNull();
    expect(error).toBe('Invalid blob ID');
  });

  it('rejects blobId < 1', () => {
    const { data, error } = validateRatingInput({ blobId: 0, score: 3 });
    expect(data).toBeNull();
    expect(error).toBe('Invalid blob ID');
  });

  it('rejects missing score', () => {
    const { data, error } = validateRatingInput({ blobId: 1 });
    expect(data).toBeNull();
    expect(error).toBe('Score must be an integer between 1 and 5');
  });

  it('rejects score < 1', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 0 });
    expect(data).toBeNull();
    expect(error).toBe('Score must be an integer between 1 and 5');
  });

  it('rejects score > 5', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 6 });
    expect(data).toBeNull();
    expect(error).toBe('Score must be an integer between 1 and 5');
  });

  it('rejects non-integer score', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 3.5 });
    expect(data).toBeNull();
    expect(error).toBe('Score must be an integer between 1 and 5');
  });

  it('accepts boundary scores 1 and 5', () => {
    expect(validateRatingInput({ blobId: 1, score: 1 }).error).toBeNull();
    expect(validateRatingInput({ blobId: 1, score: 5 }).error).toBeNull();
  });
});

// ── Tests: checkBlobVisible ────────────────────────────────────────────────

describe('checkBlobVisible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when blob is visible (not deleted, not flagged)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 1 }]);

    await expect(checkBlobVisible(1)).resolves.toBeUndefined();
  });

  it('throws "Blob not found" when blob is deleted', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(checkBlobVisible(1)).rejects.toThrow('Blob not found');
  });

  it('throws "Blob not found" when blob is flagged', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(checkBlobVisible(1)).rejects.toThrow('Blob not found');
  });

  it('throws "Blob not found" when blob does not exist', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(checkBlobVisible(999)).rejects.toThrow('Blob not found');
  });
});

// ── Tests: upsertRating ─────────────────────────────────────────────────────

describe('upsertRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs a single atomic upsert query', async () => {
    insertReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await upsertRating(1, 'user_1', 4);

    // Single insert call with the rating values
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        blobId: 1,
        raterProfileId: 'user_1',
        score: 4,
      }),
    );
    // onConflictDoUpdate called with the unique target and update set
    expect(insertOnConflictMock).toHaveBeenCalledWith({
      target: [ratings.blobId, ratings.raterProfileId],
      set: expect.objectContaining({ score: 4, updatedAt: expect.any(Date) }),
    });
    expect(result.score).toBe(4);
    expect(result.blobId).toBe(1);
  });

  it('updates the score when a rating already exists (via conflict)', async () => {
    insertReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ]);

    const result = await upsertRating(1, 'user_1', 5);

    // Still a single insert+conflict query — no separate update path
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    expect(insertOnConflictMock).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(5);
  });

  it('sets updatedAt to a fresh Date on every upsert', async () => {
    insertReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ]);

    await upsertRating(1, 'user_1', 3);

    expect(insertOnConflictMock).toHaveBeenCalledWith({
      target: [ratings.blobId, ratings.raterProfileId],
      set: expect.objectContaining({ updatedAt: expect.any(Date) }),
    });
  });
});

// ── Tests: calculateAverage ─────────────────────────────────────────────────

describe('calculateAverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 average and 0 count when no ratings exist', async () => {
    selectWhereMock.mockResolvedValueOnce([{ averageRating: 0, ratingCount: 0 }]);

    const result = await calculateAverage(1);
    expect(result).toEqual({ averageRating: 0, ratingCount: 0 });
  });

  it('returns correct average for a single rating', async () => {
    selectWhereMock.mockResolvedValueOnce([{ averageRating: 4, ratingCount: 1 }]);

    const result = await calculateAverage(1);
    expect(result).toEqual({ averageRating: 4, ratingCount: 1 });
  });

  it('returns correct average for multiple ratings', async () => {
    selectWhereMock.mockResolvedValueOnce([{ averageRating: 3.5, ratingCount: 4 }]);

    const result = await calculateAverage(1);
    expect(result).toEqual({ averageRating: 3.5, ratingCount: 4 });
  });

  it('returns 0/0 for empty result set (should not happen in practice)', async () => {
    selectWhereMock.mockResolvedValueOnce([]);

    const result = await calculateAverage(1);
    expect(result).toEqual({ averageRating: 0, ratingCount: 0 });
  });
});
