import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { selectMock, selectLimitMock, updateMock, updateSetMock, updateWhereMock } = vi.hoisted(() => {
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
  const updateMock = vi.fn().mockReturnValue({
    set: updateSetMock.mockReturnValue({
      where: updateWhereMock,
    }),
  });

  return { selectMock, selectLimitMock, updateMock, updateSetMock, updateWhereMock };
});

vi.mock('./index', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import { softDeleteBlobRecord, updateBlobRecord } from './blob-edit.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockOwnership(overrides: Partial<{ uploaderProfileId: string; deleted: number }> = {}) {
  selectLimitMock.mockResolvedValueOnce([
    {
      uploaderProfileId: overrides.uploaderProfileId ?? 'user_1',
      deleted: overrides.deleted ?? 0,
    },
  ]);
}

// ── Tests: updateBlobRecord ─────────────────────────────────────────────────

describe('updateBlobRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates blob fields when user owns the blob', async () => {
    mockOwnership({ uploaderProfileId: 'user_1' });

    const result = await updateBlobRecord(
      {
        blobId: 1,
        title: 'Updated Title',
        description: 'Updated description',
        dateOccurred: '2025-06-01',
        filamentType: 'ABS',
        machineUsed: 'Voron',
      },
      'user_1',
    );

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledWith({
      title: 'Updated Title',
      description: 'Updated description',
      dateOccurred: '2025-06-01',
      filamentType: 'ABS',
      machineUsed: 'Voron',
    });
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('allows null description', async () => {
    mockOwnership({ uploaderProfileId: 'user_1' });

    const result = await updateBlobRecord(
      {
        blobId: 1,
        title: 'No Description',
        description: null,
        dateOccurred: '2025-06-01',
        filamentType: 'PLA',
        machineUsed: 'Ender 3',
      },
      'user_1',
    );

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('throws when blob not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(
      updateBlobRecord(
        {
          blobId: 999,
          title: 'X',
          description: null,
          dateOccurred: '2025-01-01',
          filamentType: 'PLA',
          machineUsed: 'X',
        },
        'user_1',
      ),
    ).rejects.toThrow('Blob not found');
  });

  it('throws when blob is soft-deleted', async () => {
    mockOwnership({ uploaderProfileId: 'user_1', deleted: 1 });

    await expect(
      updateBlobRecord(
        { blobId: 1, title: 'X', description: null, dateOccurred: '2025-01-01', filamentType: 'PLA', machineUsed: 'X' },
        'user_1',
      ),
    ).rejects.toThrow('Blob not found');
  });

  it('throws when user does not own the blob', async () => {
    mockOwnership({ uploaderProfileId: 'other_user' });

    await expect(
      updateBlobRecord(
        { blobId: 1, title: 'X', description: null, dateOccurred: '2025-01-01', filamentType: 'PLA', machineUsed: 'X' },
        'user_1',
      ),
    ).rejects.toThrow('You can only edit your own blobs');
  });
});

// ── Tests: softDeleteBlobRecord ─────────────────────────────────────────────

describe('softDeleteBlobRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes blob when user owns it', async () => {
    mockOwnership({ uploaderProfileId: 'user_1' });

    const result = await softDeleteBlobRecord(1, 'user_1');

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledWith({ deleted: 1 });
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('throws when blob not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(softDeleteBlobRecord(999, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when blob is already soft-deleted', async () => {
    mockOwnership({ uploaderProfileId: 'user_1', deleted: 1 });

    await expect(softDeleteBlobRecord(1, 'user_1')).rejects.toThrow('Blob not found');
  });

  it('throws when user does not own the blob', async () => {
    mockOwnership({ uploaderProfileId: 'other_user' });

    await expect(softDeleteBlobRecord(1, 'user_1')).rejects.toThrow('You can only edit your own blobs');
  });
});
