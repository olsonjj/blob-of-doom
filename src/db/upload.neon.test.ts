/**
 * Neon HTTP-level tests for upload rate limiting (checkUploadLimit, incrementUploadCount).
 *
 * These tests mock at the @neondatabase/serverless boundary so the real
 * Drizzle query builder runs. This catches regressions when Drizzle APIs
 * or query patterns change.
 *
 * Key scenarios:
 * - Approved user gets 10/day
 * - Unapproved user gets 1/day
 * - Admin bypasses rate limit
 * - Concurrent requests can't race (atomic UPDATE with WHERE guard)
 * - Failed upload rolls back count (tested via the rollback logic in uploadBlob handler)
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
import {
  emptyMutationResult,
  emptySelectResult,
  mutationArrayResult,
  oneProfileRow,
  profileRow,
  PROFILES_COLUMNS,
  UPLOAD_COUNT_COLUMNS,
  uploadCountRow,
} from './test-helpers';
import { checkUploadLimit, incrementUploadCount, todayDateString, validateUploadInput } from './upload.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function queueProfileResponse(overrides: Parameters<typeof profileRow>[0] = {}) {
  mockQueryFn.query.mockResolvedValueOnce(oneProfileRow(overrides));
}

function queueEmptyProfileResponse() {
  mockQueryFn.query.mockResolvedValueOnce(emptySelectResult(PROFILES_COLUMNS));
}

function queueIncrementSuccess(newCount: number) {
  mockQueryFn.query.mockResolvedValueOnce(
    mutationArrayResult([uploadCountRow(newCount)], UPLOAD_COUNT_COLUMNS, 'UPDATE'),
  );
}

function queueIncrementRaceLost() {
  mockQueryFn.query.mockResolvedValueOnce(emptyMutationResult('UPDATE'));
}

// ── Tests: checkUploadLimit ─────────────────────────────────────────────────

describe('checkUploadLimit (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when profile has no upload today', async () => {
    queueProfileResponse({ uploadCountToday: 0, lastUploadDate: '2024-12-01', approved: 0 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result).toEqual({ currentCount: 0, lastDate: '2024-12-01', limit: 1 });
  });

  it('resolves when profile has never uploaded (null lastUploadDate)', async () => {
    queueProfileResponse({ uploadCountToday: 0, lastUploadDate: null, approved: 0 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result).toEqual({ currentCount: 0, lastDate: null, limit: 1 });
  });

  it('throws when unapproved user reaches 1/day limit', async () => {
    queueProfileResponse({ uploadCountToday: 1, lastUploadDate: '2024-12-02', approved: 0 });

    await expect(checkUploadLimit('user_1', '2024-12-02')).rejects.toThrow(
      'Upload limit reached. You can upload 1 blob(s) per day.',
    );
  });

  it('throws when profile not found', async () => {
    queueEmptyProfileResponse();

    await expect(checkUploadLimit('user_1', '2024-12-02')).rejects.toThrow('Profile not found');
  });

  it('allows admins to bypass the daily limit (limit = -1)', async () => {
    queueProfileResponse({ uploadCountToday: 50, lastUploadDate: '2024-12-02', isAdmin: 1 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result).toEqual({ currentCount: 50, lastDate: '2024-12-02', limit: -1 });
  });

  it('grants approved users a limit of 10/day', async () => {
    queueProfileResponse({ uploadCountToday: 5, lastUploadDate: '2024-12-02', approved: 1 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result).toEqual({ currentCount: 5, lastDate: '2024-12-02', limit: 10 });
  });

  it('throws when approved user reaches 10/day', async () => {
    queueProfileResponse({ uploadCountToday: 10, lastUploadDate: '2024-12-02', approved: 1 });

    await expect(checkUploadLimit('user_1', '2024-12-02')).rejects.toThrow(
      'Upload limit reached. You can upload 10 blob(s) per day.',
    );
  });

  it('does not throw when approved user has 9/10 (still under limit)', async () => {
    queueProfileResponse({ uploadCountToday: 9, lastUploadDate: '2024-12-02', approved: 1 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result.limit).toBe(10);
  });

  it('resets count when it is a new day', async () => {
    queueProfileResponse({ uploadCountToday: 1, lastUploadDate: '2024-12-01', approved: 0 });

    const result = await checkUploadLimit('user_1', '2024-12-02');
    expect(result.currentCount).toBe(1);
    expect(result.lastDate).toBe('2024-12-01');
  });

  it('queries the profiles table for the correct user', async () => {
    queueProfileResponse();

    await checkUploadLimit('user_specific', '2024-12-02');

    const sql = mockQueryFn.query.mock.calls[0][0] as string;
    expect(sql).toContain('profiles');
    expect(sql).toContain('clerk_user_id');
    expect(mockQueryFn.query.mock.calls[0][1]).toEqual(['user_specific', 1]);
  });
});

// ── Tests: incrementUploadCount ─────────────────────────────────────────────

describe('incrementUploadCount (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments count for a new day (resets to 1)', async () => {
    queueProfileResponse({ uploadCountToday: 5, lastUploadDate: '2024-12-01' });
    queueIncrementSuccess(1);

    const result = await incrementUploadCount('user_1', 1, '2024-12-02');
    expect(result.newCount).toBe(1);
    expect(result.previousCount).toBe(5);
    expect(result.previousDate).toBe('2024-12-01');
  });

  it('increments count for the same day', async () => {
    queueProfileResponse({ uploadCountToday: 3, lastUploadDate: '2024-12-02' });
    queueIncrementSuccess(4);

    const result = await incrementUploadCount('user_1', 10, '2024-12-02');
    expect(result.newCount).toBe(4);
    expect(result.previousCount).toBe(3);
    expect(result.previousDate).toBe('2024-12-02');
  });

  it('throws when the atomic UPDATE returns no rows (race lost)', async () => {
    queueProfileResponse({ uploadCountToday: 0, lastUploadDate: '2024-12-02' });
    queueIncrementRaceLost();

    await expect(incrementUploadCount('user_1', 1, '2024-12-02')).rejects.toThrow('Upload limit reached');
  });

  it('handles null previous date (first ever upload)', async () => {
    queueProfileResponse({ uploadCountToday: 0, lastUploadDate: null });
    queueIncrementSuccess(1);

    const result = await incrementUploadCount('user_1', 1, '2024-12-02');
    expect(result.newCount).toBe(1);
    expect(result.previousCount).toBe(0);
    expect(result.previousDate).toBeNull();
  });

  it('uses a CASE expression to handle new-day vs same-day', async () => {
    queueProfileResponse();
    queueIncrementSuccess(1);

    await incrementUploadCount('user_1', 1, '2024-12-02');

    const updateSql = mockQueryFn.query.mock.calls[1][0] as string;
    expect(updateSql).toContain('CASE');
    expect(updateSql).toContain('last_upload_date');
  });

  it('includes a WHERE guard that checks the limit', async () => {
    queueProfileResponse();
    queueIncrementSuccess(1);

    await incrementUploadCount('user_1', 10, '2024-12-02');

    const updateSql = mockQueryFn.query.mock.calls[1][0] as string;
    expect(updateSql).toContain('upload_count_today');
  });

  it('makes exactly two queries: snapshot + atomic update', async () => {
    queueProfileResponse();
    queueIncrementSuccess(1);

    await incrementUploadCount('user_1', 1, '2024-12-02');
    expect(mockQueryFn.query).toHaveBeenCalledTimes(2);
  });
});

// ── Tests: todayDateString ──────────────────────────────────────────────────

describe('todayDateString', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Tests: validateUploadInput (no DB calls) ────────────────────────────────

describe('validateUploadInput (neon-level)', () => {
  function makeMockFile(name = 'test.jpg', type = 'image/jpeg', byteLength = 1024): File {
    const content = new Uint8Array(byteLength).fill(0x41);
    return new File([content], name, { type });
  }

  function buildFormData(overrides: Record<string, string | File | null> = {}): FormData {
    const fd = new FormData();
    fd.set('title', overrides.title !== undefined ? (overrides.title as string) : 'Test Blob');
    fd.set('dateOccurred', overrides.dateOccurred !== undefined ? (overrides.dateOccurred as string) : '2024-12-01');
    fd.set('filamentType', overrides.filamentType !== undefined ? (overrides.filamentType as string) : 'PLA');
    fd.set('machineUsed', overrides.machineUsed !== undefined ? (overrides.machineUsed as string) : 'Ender 3');
    if (overrides.image !== null) {
      fd.set('image', (overrides.image as File) ?? makeMockFile());
    }
    if (overrides.description !== undefined) {
      if (overrides.description) fd.set('description', overrides.description as string);
    } else {
      fd.set('description', 'A test description');
    }
    return fd;
  }

  it('returns clean data for valid input', () => {
    const fd = buildFormData();
    const { data, errors } = validateUploadInput(fd);
    expect(errors).toHaveLength(0);
    expect(data).not.toBeNull();
    expect(data!.title).toBe('Test Blob');
  });

  it('returns errors for missing required fields', () => {
    const fd = buildFormData({ title: '', filamentType: '', image: null });
    const { data, errors } = validateUploadInput(fd);
    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects unsupported image types', () => {
    const fd = buildFormData({ image: makeMockFile('test.gif', 'image/gif') });
    const { errors } = validateUploadInput(fd);
    expect(errors.some((e) => e.field === 'image' && e.message.includes('Unsupported'))).toBe(true);
  });

  it('rejects oversized images', () => {
    const fd = buildFormData({ image: makeMockFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024) });
    const { errors } = validateUploadInput(fd);
    expect(errors.some((e) => e.field === 'image' && e.message.includes('10 MB'))).toBe(true);
  });
});
