/**
 * Neon HTTP-level tests for blob ownership guards (updateBlobRecord, softDeleteBlobRecord).
 *
 * These tests mock at the @neondatabase/serverless boundary so the real
 * Drizzle query builder runs. This catches regressions when Drizzle APIs
 * or query patterns change.
 *
 * Key scenarios:
 * - User can edit own blob
 * - User cannot edit another's blob
 * - Admin can edit any blob (bypasses ownership check)
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
import { softDeleteBlobRecord, updateBlobRecord } from './blob-edit.func';
import {
  ADMIN_CHECK_COLUMNS,
  BLOB_IMAGE_URL_COLUMNS,
  BLOB_OWNERSHIP_COLUMNS,
  blobImageUrlRow,
  blobOwnershipRow,
  emptyMutationResult,
  emptySelectResult,
  selectArrayResult,
} from './test-helpers';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Queue responses for verifyOwnership (now makes 2 queries):
 * 1. SELECT uploader_profile_id, deleted FROM blobs WHERE id = blobId
 * 2. SELECT is_admin FROM profiles WHERE clerk_user_id = userId (admin check)
 */
function queueOwnershipCheck(uploaderProfileId: string, deleted = 0) {
  mockQueryFn.query.mockResolvedValueOnce(
    selectArrayResult([blobOwnershipRow(uploaderProfileId, deleted)], BLOB_OWNERSHIP_COLUMNS),
  );
}

function queueAdminCheck(isAdmin: number) {
  mockQueryFn.query.mockResolvedValueOnce(
    selectArrayResult([[isAdmin]], ADMIN_CHECK_COLUMNS),
  );
}

function queueBlobNotFound() {
  mockQueryFn.query.mockResolvedValueOnce(emptySelectResult(BLOB_OWNERSHIP_COLUMNS));
}

function queueUpdateSuccess() {
  mockQueryFn.query.mockResolvedValueOnce(emptyMutationResult('UPDATE'));
}

function queueImageUrls(thumb = 'https://example.com/thumb.webp', medium = 'https://example.com/medium.webp', full = 'https://example.com/full.webp') {
  mockQueryFn.query.mockResolvedValueOnce(
    selectArrayResult([blobImageUrlRow(thumb, medium, full)], BLOB_IMAGE_URL_COLUMNS),
  );
}

const validInput = {
  blobId: 1,
  title: 'Updated Title',
  description: 'Updated description',
  dateOccurred: '2025-06-01',
  filamentType: 'ABS',
  machineUsed: 'Voron',
};

// ── Tests: updateBlobRecord ─────────────────────────────────────────────────

describe('updateBlobRecord (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates blob fields when user owns the blob', async () => {
    queueOwnershipCheck('user_1');
    queueAdminCheck(0);
    queueUpdateSuccess();

    const result = await updateBlobRecord(validInput, 'user_1');
    expect(result).toEqual({ success: true });
    // 3 queries: ownership, admin check, update
    expect(mockQueryFn.query).toHaveBeenCalledTimes(3);
    const updateSql = mockQueryFn.query.mock.calls[2][0] as string;
    expect(updateSql).toContain('update');
    expect(updateSql).toContain('blobs');
  });

  it('allows null description', async () => {
    queueOwnershipCheck('user_1');
    queueAdminCheck(0);
    queueUpdateSuccess();

    const result = await updateBlobRecord({ ...validInput, description: null }, 'user_1');
    expect(result).toEqual({ success: true });
  });

  it('throws when blob not found', async () => {
    queueBlobNotFound();

    await expect(updateBlobRecord(validInput, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when blob is soft-deleted', async () => {
    queueOwnershipCheck('user_1', 1);

    await expect(updateBlobRecord(validInput, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when user does not own the blob', async () => {
    queueOwnershipCheck('other_user');
    queueAdminCheck(0);

    await expect(updateBlobRecord(validInput, 'user_1')).rejects.toThrow(
      'You can only edit your own blobs',
    );
  });

  it('allows admin to edit any blob (bypasses ownership)', async () => {
    queueOwnershipCheck('other_user');
    queueAdminCheck(1); // isAdmin = 1 → bypass
    queueUpdateSuccess();

    const result = await updateBlobRecord(validInput, 'admin_user');
    expect(result).toEqual({ success: true });
    expect(mockQueryFn.query).toHaveBeenCalledTimes(3);
  });

  it('admin cannot edit deleted blobs (deleted check still applies)', async () => {
    queueOwnershipCheck('user_1', 1);

    await expect(updateBlobRecord(validInput, 'admin_user')).rejects.toThrow('Blob not found');
  });
});

// ── Tests: softDeleteBlobRecord ────────────────────────────────────────────

describe('softDeleteBlobRecord (neon-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes blob when user owns it', async () => {
    queueOwnershipCheck('user_1');
    queueAdminCheck(0);
    queueImageUrls();
    queueUpdateSuccess();

    const result = await softDeleteBlobRecord(1, 'user_1');
    expect(result).toEqual({ success: true });
    // 4 queries: ownership, admin check, image URLs, update
    expect(mockQueryFn.query).toHaveBeenCalledTimes(4);
    const updateSql = mockQueryFn.query.mock.calls[3][0] as string;
    expect(updateSql).toContain('update');
    expect(updateSql).toContain('blobs');
  });

  it('throws when blob not found', async () => {
    queueBlobNotFound();

    await expect(softDeleteBlobRecord(999, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when blob is already soft-deleted', async () => {
    queueOwnershipCheck('user_1', 1);

    await expect(softDeleteBlobRecord(1, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when user does not own the blob', async () => {
    queueOwnershipCheck('other_user');
    queueAdminCheck(0);

    await expect(softDeleteBlobRecord(1, 'user_1')).rejects.toThrow(
      'You can only edit your own blobs',
    );
  });

  it('allows admin to soft-delete any blob', async () => {
    queueOwnershipCheck('other_user');
    queueAdminCheck(1);
    queueImageUrls();
    queueUpdateSuccess();

    const result = await softDeleteBlobRecord(1, 'admin_user');
    expect(result).toEqual({ success: true });
    expect(mockQueryFn.query).toHaveBeenCalledTimes(4);
  });
});
