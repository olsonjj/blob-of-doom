/**
 * Neon HTTP-level tests for rating operations (checkBlobVisible, upsertRating, calculateAverage).
 *
 * These tests mock at the @neondatabase/serverless boundary so the real
 * Drizzle query builder runs. This catches regressions when Drizzle APIs
 * or query patterns change.
 *
 * Key scenarios:
 * - Insert new rating
 * - Update existing rating (upsert)
 * - Concurrent upserts from same user don't conflict (atomic ON CONFLICT)
 * - Rating hidden/deleted/flagged blob throws
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted neon mock ──────────────────────────────────────────────────────
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

// Now safe to import
import { calculateAverage, checkBlobVisible, upsertRating, validateRatingInput } from './rating.func';
import {
  AVERAGE_RATING_COLUMNS,
  averageRatingRow,
  BLOB_VISIBLE_COLUMNS,
  emptySelectResult,
  mutationArrayResult,
  ratingRow,
  RATINGS_COLUMNS,
  selectArrayResult,
} from './test-helpers';

// ── Helpers ─────────────────────────────────────────────────────────────────

function queueBlobVisible(visible: boolean) {
  mockQueryFn.query.mockResolvedValueOnce(
    visible
      ? selectArrayResult([[1]], BLOB_VISIBLE_COLUMNS)
      : emptySelectResult(BLOB_VISIBLE_COLUMNS),
  );
}

function queueUpsertResponse(overrides: Parameters<typeof ratingRow>[0] = {}) {
  mockQueryFn.query.mockResolvedValueOnce(
    mutationArrayResult([ratingRow(overrides)], RATINGS_COLUMNS, 'INSERT'),
  );
}

function queueAverageResponse(averageRating: number, ratingCount: number) {
  mockQueryFn.query.mockResolvedValueOnce(
    selectArrayResult([averageRatingRow(averageRating, ratingCount)], AVERAGE_RATING_COLUMNS),
  );
}

// ── Tests: validateRatingInput (pure function — no DB) ──────────────────────

describe('validateRatingInput (neon-level)', () => {
  it('returns clean data for valid input', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 3 });
    expect(error).toBeNull();
    expect(data).toEqual({ blobId: 1, score: 3 });
  });

  it('rejects non-object input', () => {
    expect(validateRatingInput(null).error).toBe('Invalid input');
    expect(validateRatingInput(undefined).error).toBe('Invalid input');
    expect(validateRatingInput('foo').error).toBe('Invalid input');
  });

  it('rejects invalid blobId', () => {
    expect(validateRatingInput({ score: 3 }).error).toBe('Invalid blob ID');
    expect(validateRatingInput({ blobId: 1.5, score: 3 }).error).toBe('Invalid blob ID');
    expect(validateRatingInput({ blobId: 0, score: 3 }).error).toBe('Invalid blob ID');
    expect(validateRatingInput({ blobId: -1, score: 3 }).error).toBe('Invalid blob ID');
  });

  it('rejects invalid score', () => {
    expect(validateRatingInput({ blobId: 1 }).error).toBe('Score must be an integer between 1 and 5');
    expect(validateRatingInput({ blobId: 1, score: 0 }).error).toBe('Score must be an integer between 1 and 5');
    expect(validateRatingInput({ blobId: 1, score: 6 }).error).toBe('Score must be an integer between 1 and 5');
    expect(validateRatingInput({ blobId: 1, score: 3.5 }).error).toBe('Score must be an integer between 1 and 5');
  });

  it('accepts boundary scores 1 and 5', () => {
    expect(validateRatingInput({ blobId: 1, score: 1 }).error).toBeNull();
    expect(validateRatingInput({ blobId: 1, score: 5 }).error).toBeNull();
  });
});

// ── Tests: checkBlobVisible ────────────────────────────────────────────────

describe('checkBlobVisible (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when blob is visible (not deleted, not flagged)', async () => {
    queueBlobVisible(true);
    await expect(checkBlobVisible(1)).resolves.toBeUndefined();
  });

  it('throws "Blob not found" when blob is deleted', async () => {
    queueBlobVisible(false);
    await expect(checkBlobVisible(1)).rejects.toThrow('Blob not found');
  });

  it('throws "Blob not found" when blob is flagged', async () => {
    queueBlobVisible(false);
    await expect(checkBlobVisible(1)).rejects.toThrow('Blob not found');
  });

  it('throws "Blob not found" when blob does not exist', async () => {
    queueBlobVisible(false);
    await expect(checkBlobVisible(999)).rejects.toThrow('Blob not found');
  });

  it('queries with deleted=0 AND flagged=0 conditions', async () => {
    queueBlobVisible(true);
    await checkBlobVisible(42);

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('blobs');
    expect(sql).toContain('deleted');
    expect(sql).toContain('flagged');
  });
});

// ── Tests: upsertRating ─────────────────────────────────────────────────────

describe('upsertRating (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a new rating via atomic upsert', async () => {
    queueUpsertResponse({ blobId: 1, raterProfileId: 'user_1', score: 4 });

    const result = await upsertRating(1, 'user_1', 4);

    expect(result.score).toBe(4);
    expect(result.blobId).toBe(1);
    expect(result.raterProfileId).toBe('user_1');

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('insert');
    expect(sql).toContain('on conflict');
    expect(sql).toContain('ratings');
  });

  it('updates the score when a rating already exists (via ON CONFLICT)', async () => {
    queueUpsertResponse({ blobId: 1, raterProfileId: 'user_1', score: 5 });

    const result = await upsertRating(1, 'user_1', 5);

    expect(result.score).toBe(5);
    expect(mockQueryFn.query).toHaveBeenCalledTimes(1);
  });

  it('uses the unique constraint on (blob_id, rater_profile_id)', async () => {
    queueUpsertResponse();

    await upsertRating(1, 'user_1', 3);

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('blob_id');
    expect(sql).toContain('rater_profile_id');
  });

  it('sets updated_at on every upsert', async () => {
    queueUpsertResponse();

    await upsertRating(1, 'user_1', 3);

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('updated_at');
  });

  it('two upserts from the same user use the same atomic path', async () => {
    queueUpsertResponse({ score: 3 });
    queueUpsertResponse({ score: 5 });

    await upsertRating(1, 'user_1', 3);
    await upsertRating(1, 'user_1', 5);

    expect(mockQueryFn.query).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 2; i++) {
      const sql = mockQueryFn.query.mock.calls[i][0] as string;
      expect(sql).toContain('on conflict');
    }
  });
});

// ── Tests: calculateAverage ─────────────────────────────────────────────────

describe('calculateAverage (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 average and 0 count when no ratings exist', async () => {
    queueAverageResponse(0, 0);
    expect(await calculateAverage(1)).toEqual({ averageRating: 0, ratingCount: 0 });
  });

  it('returns correct average for a single rating', async () => {
    queueAverageResponse(4, 1);
    expect(await calculateAverage(1)).toEqual({ averageRating: 4, ratingCount: 1 });
  });

  it('returns correct average for multiple ratings', async () => {
    queueAverageResponse(3.5, 4);
    expect(await calculateAverage(1)).toEqual({ averageRating: 3.5, ratingCount: 4 });
  });

  it('uses AVG and COUNT aggregates', async () => {
    queueAverageResponse(3, 2);
    await calculateAverage(1);

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('AVG');
    expect(sql).toContain('COUNT');
    expect(sql).toContain('ratings');
  });

  it('returns 0/0 for empty result set', async () => {
    mockQueryFn.query.mockResolvedValueOnce(emptySelectResult(AVERAGE_RATING_COLUMNS));
    expect(await calculateAverage(1)).toEqual({ averageRating: 0, ratingCount: 0 });
  });
});
