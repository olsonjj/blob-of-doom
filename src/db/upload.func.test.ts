import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const { insertMock, updateMock, selectMock, selectLimitMock } = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const insertReturningMock = vi.fn();
  const insertMock = vi.fn().mockReturnValue({
    values: insertValuesMock.mockReturnValue({ returning: insertReturningMock }),
  });

  const updateSetMock = vi.fn();
  const updateWhereMock = vi.fn();
  const updateMock = vi.fn().mockReturnValue({
    set: updateSetMock.mockReturnValue({ where: updateWhereMock }),
  });

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

  return {
    insertMock,
    insertValuesMock,
    insertReturningMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
    selectMock,
    selectFromMock,
    selectWhereMock,
    selectLimitMock,
  };
});

vi.mock('./index', () => ({
  db: {
    insert: insertMock,
    update: updateMock,
    select: selectMock,
  },
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

vi.mock('sharp', () => {
  const mockSharp = vi.fn();
  mockSharp.mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-webp-data')),
  });
  return { default: mockSharp };
});

import { checkUploadLimit, processImageVariants, todayDateString, validateUploadInput } from './upload.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeMockFile(name = 'test.jpg', type = 'image/jpeg', byteLength = 1024): File {
  // File size is derived from content, so we build a buffer of the desired length
  const content = new Uint8Array(byteLength).fill(0x41); // 'A'
  return new File([content], name, { type });
}

function buildFormData(overrides: Record<string, string | File | null> = {}): FormData {
  const fd = new FormData();
  fd.set('title', overrides.title !== undefined ? (overrides.title as string) : 'Test Blob');
  fd.set('dateOccurred', overrides.dateOccurred !== undefined ? (overrides.dateOccurred as string) : '2024-12-01');
  fd.set('filamentType', overrides.filamentType !== undefined ? (overrides.filamentType as string) : 'PLA');
  fd.set('machineUsed', overrides.machineUsed !== undefined ? (overrides.machineUsed as string) : 'Ender 3');

  // Image: only set if not explicitly null
  if (overrides.image !== null) {
    fd.set('image', (overrides.image as File) ?? makeMockFile());
  }

  if (overrides.description !== undefined) {
    if (overrides.description) fd.set('description', overrides.description as string);
    // if null, omit description entirely
  } else {
    fd.set('description', 'A test description');
  }

  return fd;
}

// ── Tests: validateUploadInput ──────────────────────────────────────────────

describe('validateUploadInput', () => {
  it('returns clean data for valid input', () => {
    const fd = buildFormData();
    const { data, errors } = validateUploadInput(fd);

    expect(errors).toHaveLength(0);
    expect(data).not.toBeNull();
    expect(data!.title).toBe('Test Blob');
    expect(data!.dateOccurred).toBe('2024-12-01');
    expect(data!.filamentType).toBe('PLA');
    expect(data!.machineUsed).toBe('Ender 3');
    expect(data!.description).toBe('A test description');
    expect(data!.image).toBeInstanceOf(File);
  });

  it('returns error for missing title', () => {
    const fd = buildFormData({ title: '' });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('returns error for missing dateOccurred', () => {
    const fd = buildFormData({ dateOccurred: '' });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'dateOccurred')).toBe(true);
  });

  it('returns error for missing filamentType', () => {
    const fd = buildFormData({ filamentType: '' });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'filamentType')).toBe(true);
  });

  it('returns error for missing machineUsed', () => {
    const fd = buildFormData({ machineUsed: '' });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'machineUsed')).toBe(true);
  });

  it('returns error for missing image', () => {
    const fd = buildFormData({ image: null });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'image')).toBe(true);
  });

  it('returns error for unsupported image type', () => {
    const fd = buildFormData({ image: makeMockFile('test.gif', 'image/gif') });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'image' && e.message.includes('Unsupported'))).toBe(true);
  });

  it('returns error for oversized image', () => {
    const fd = buildFormData({
      image: makeMockFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024),
    });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.some((e) => e.field === 'image' && e.message.includes('10 MB'))).toBe(true);
  });

  it('allows null description (optional field)', () => {
    const fd = buildFormData({ description: null });
    const { data, errors } = validateUploadInput(fd);

    expect(errors).toHaveLength(0);
    expect(data!.description).toBeNull();
  });

  it('trims whitespace from text fields', () => {
    const fd = buildFormData({
      title: '  Spaced Out  ',
      filamentType: '  PLA+  ',
      machineUsed: '  Voron  ',
    });
    const { data } = validateUploadInput(fd);

    expect(data!.title).toBe('Spaced Out');
    expect(data!.filamentType).toBe('PLA+');
    expect(data!.machineUsed).toBe('Voron');
  });

  it('returns multiple errors at once', () => {
    const fd = buildFormData({ title: '', filamentType: '', image: null });
    const { data, errors } = validateUploadInput(fd);

    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain('title');
    expect(fields).toContain('filamentType');
    expect(fields).toContain('image');
  });
});

// ── Tests: processImageVariants ─────────────────────────────────────────────

describe('processImageVariants', () => {
  it('returns three buffers (thumbnail, medium, full)', async () => {
    const buffer = Buffer.from('fake-image-data');
    const result = await processImageVariants(buffer);

    expect(result).toHaveProperty('thumbnail');
    expect(result).toHaveProperty('medium');
    expect(result).toHaveProperty('full');
    expect(Buffer.isBuffer(result.thumbnail)).toBe(true);
    expect(Buffer.isBuffer(result.medium)).toBe(true);
    expect(Buffer.isBuffer(result.full)).toBe(true);
  });
});

// ── Tests: checkUploadLimit ─────────────────────────────────────────────────

describe('checkUploadLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when profile has no upload today', async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        clerkUserId: 'user_1',
        uploadCountToday: 0,
        lastUploadDate: '2024-12-01',
        approved: 0,
        banned: 0,
        createdAt: new Date(),
      },
    ]);

    await expect(checkUploadLimit('user_1', '2024-12-02')).resolves.toEqual({
      currentCount: 0,
      lastDate: '2024-12-01',
    });
  });

  it('resolves when profile has never uploaded (null lastUploadDate)', async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        clerkUserId: 'user_1',
        uploadCountToday: 0,
        lastUploadDate: null,
        approved: 0,
        banned: 0,
        createdAt: new Date(),
      },
    ]);

    await expect(checkUploadLimit('user_1', '2024-12-02')).resolves.toEqual({ currentCount: 0, lastDate: null });
  });

  it('throws when upload limit reached (same day, count >= 1)', async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        clerkUserId: 'user_1',
        uploadCountToday: 1,
        lastUploadDate: '2024-12-02',
        approved: 0,
        banned: 0,
        createdAt: new Date(),
      },
    ]);

    await expect(checkUploadLimit('user_1', '2024-12-02')).rejects.toThrow('Upload limit reached');
  });

  it('throws when profile not found', async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    await expect(checkUploadLimit('user_1', '2024-12-02')).rejects.toThrow('Profile not found');
  });

  it('allows admins to bypass the daily limit', async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        clerkUserId: 'user_1',
        uploadCountToday: 5,
        lastUploadDate: '2024-12-02',
        approved: 1,
        banned: 0,
        isAdmin: 1,
        createdAt: new Date(),
      },
    ]);

    await expect(checkUploadLimit('user_1', '2024-12-02')).resolves.toEqual({
      currentCount: 5,
      lastDate: '2024-12-02',
    });
  });
});

// ── Tests: todayDateString ───────────────────────────────────────────────────

describe('todayDateString', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = todayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
