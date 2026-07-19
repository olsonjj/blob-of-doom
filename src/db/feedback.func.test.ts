import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const {
  insertValuesMock,
  insertReturningMock,
  insertMock,
  selectMock,
  selectFromMock,
  selectOrderByMock,
  updateMock,
  updateSetMock,
  updateWhereMock,
  updateReturningMock,
  deleteMock,
  deleteWhereMock,
  deleteReturningMock,
} = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const insertReturningMock = vi.fn();
  const insertMock = vi.fn().mockReturnValue({
    values: insertValuesMock.mockReturnValue({
      returning: insertReturningMock,
    }),
  });

  const selectOrderByMock = vi.fn();
  const selectFromMock = vi.fn().mockReturnValue({ orderBy: selectOrderByMock });
  const selectMock = vi.fn().mockReturnValue({ from: selectFromMock });

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
  const deleteReturningMock = vi.fn();
  const deleteMock = vi.fn().mockReturnValue({
    where: deleteWhereMock.mockReturnValue({
      returning: deleteReturningMock,
    }),
  });

  return {
    insertValuesMock,
    insertReturningMock,
    insertMock,
    selectMock,
    selectFromMock,
    selectOrderByMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
    updateReturningMock,
    deleteMock,
    deleteWhereMock,
    deleteReturningMock,
  };
});

vi.mock('./index', () => ({
  db: {
    insert: insertMock,
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

import {
  insertFeedback,
  queryAllFeedback,
  removeFeedback,
  toggleResolved,
  validateFeedbackInput,
} from './feedback.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFeedbackRow(
  overrides: Partial<{
    id: number;
    category: string;
    message: string;
    email: string | null;
    submitterProfileId: string | null;
    submitterProvider: string | null;
    resolved: number;
    createdAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 1,
    category: overrides.category ?? 'bug',
    message: overrides.message ?? 'Test feedback',
    email: overrides.email ?? null,
    submitterProfileId: overrides.submitterProfileId ?? null,
    submitterProvider: overrides.submitterProvider ?? null,
    resolved: overrides.resolved ?? 0,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

// ── Tests: validateFeedbackInput ────────────────────────────────────────────

describe('validateFeedbackInput', () => {
  it('returns clean data for valid bug submission', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug', message: 'Something is broken' });
    expect(error).toBeNull();
    expect(data).toEqual({ category: 'bug', message: 'Something is broken', email: null });
  });

  it('returns clean data for valid feature submission', () => {
    const { data, error } = validateFeedbackInput({ category: 'feature', message: 'Add dark mode' });
    expect(error).toBeNull();
    expect(data).toEqual({ category: 'feature', message: 'Add dark mode', email: null });
  });

  it('returns clean data with optional email', () => {
    const { data, error } = validateFeedbackInput({
      category: 'bug',
      message: 'Broken link',
      email: 'user@example.com',
    });
    expect(error).toBeNull();
    expect(data).toEqual({ category: 'bug', message: 'Broken link', email: 'user@example.com' });
  });

  it('trims whitespace from message', () => {
    const { data } = validateFeedbackInput({ category: 'bug', message: '  hello  ' });
    expect(data!.message).toBe('hello');
  });

  it('trims whitespace from email', () => {
    const { data } = validateFeedbackInput({ category: 'bug', message: 'test', email: '  a@b.com  ' });
    expect(data!.email).toBe('a@b.com');
  });

  it('treats empty email string as null', () => {
    const { data } = validateFeedbackInput({ category: 'bug', message: 'test', email: '   ' });
    expect(data!.email).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(validateFeedbackInput(null).error).toBe('Invalid input');
    expect(validateFeedbackInput(undefined).error).toBe('Invalid input');
    expect(validateFeedbackInput('foo').error).toBe('Invalid input');
    expect(validateFeedbackInput(42).error).toBe('Invalid input');
  });

  it('rejects invalid category', () => {
    const { data, error } = validateFeedbackInput({ category: 'spam', message: 'test' });
    expect(data).toBeNull();
    expect(error).toBe('Category must be "bug" or "feature"');
  });

  it('rejects missing category', () => {
    const { data, error } = validateFeedbackInput({ message: 'test' });
    expect(data).toBeNull();
    expect(error).toBe('Category must be "bug" or "feature"');
  });

  it('rejects empty message', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug', message: '' });
    expect(data).toBeNull();
    expect(error).toBe('Message is required');
  });

  it('rejects whitespace-only message', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug', message: '   ' });
    expect(data).toBeNull();
    expect(error).toBe('Message is required');
  });

  it('rejects missing message', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug' });
    expect(data).toBeNull();
    expect(error).toBe('Message is required');
  });

  it('rejects message over 500 characters', () => {
    const longMsg = 'a'.repeat(501);
    const { data, error } = validateFeedbackInput({ category: 'bug', message: longMsg });
    expect(data).toBeNull();
    expect(error).toBe('Message must be 500 characters or fewer');
  });

  it('accepts message at exactly 500 characters', () => {
    const msg = 'a'.repeat(500);
    const { data, error } = validateFeedbackInput({ category: 'bug', message: msg });
    expect(error).toBeNull();
    expect(data!.message).toBe(msg);
  });

  it('rejects invalid email format', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug', message: 'test', email: 'not-an-email' });
    expect(data).toBeNull();
    expect(error).toBe('Invalid email format');
  });

  it('rejects non-string email', () => {
    const { data, error } = validateFeedbackInput({ category: 'bug', message: 'test', email: 123 });
    expect(data).toBeNull();
    expect(error).toBe('Email must be a string');
  });
});

// ── Tests: insertFeedback ───────────────────────────────────────────────────

describe('insertFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a bug report with all fields', async () => {
    const row = makeFeedbackRow({
      category: 'bug',
      message: 'Something is broken',
      email: 'user@example.com',
      submitterProfileId: 'user_1',
    });
    insertReturningMock.mockResolvedValueOnce([row]);

    const result = await insertFeedback('bug', 'Something is broken', 'user@example.com', 'user_1', 'google');

    expect(insertValuesMock).toHaveBeenCalledWith({
      category: 'bug',
      message: 'Something is broken',
      email: 'user@example.com',
      submitterProfileId: 'user_1',
      submitterProvider: 'google',
    });
    expect(result).toEqual(row);
    expect(result.category).toBe('bug');
    expect(result.submitterProfileId).toBe('user_1');
  });

  it('inserts an anonymous submission with email', async () => {
    const row = makeFeedbackRow({
      category: 'feature',
      message: 'Add dark mode',
      email: 'anon@example.com',
      submitterProfileId: null,
    });
    insertReturningMock.mockResolvedValueOnce([row]);

    const result = await insertFeedback('feature', 'Add dark mode', 'anon@example.com', null, null);

    expect(insertValuesMock).toHaveBeenCalledWith({
      category: 'feature',
      message: 'Add dark mode',
      email: 'anon@example.com',
      submitterProfileId: null,
      submitterProvider: null,
    });
    expect(result.submitterProfileId).toBeNull();
    expect(result.email).toBe('anon@example.com');
  });

  it('inserts an anonymous submission without email', async () => {
    const row = makeFeedbackRow({
      category: 'bug',
      message: 'Page is slow',
      email: null,
      submitterProfileId: null,
    });
    insertReturningMock.mockResolvedValueOnce([row]);

    const result = await insertFeedback('bug', 'Page is slow', null, null, null);

    expect(insertValuesMock).toHaveBeenCalledWith({
      category: 'bug',
      message: 'Page is slow',
      email: null,
      submitterProfileId: null,
      submitterProvider: null,
    });
    expect(result.email).toBeNull();
    expect(result.submitterProfileId).toBeNull();
  });

  it('returns the inserted row with generated id and timestamp', async () => {
    const row = makeFeedbackRow({ id: 42, createdAt: new Date('2025-07-20T12:00:00Z') });
    insertReturningMock.mockResolvedValueOnce([row]);

    const result = await insertFeedback('bug', 'test', null, null, null);

    expect(result.id).toBe(42);
    expect(result.createdAt).toEqual(new Date('2025-07-20T12:00:00Z'));
  });
});

// ── Tests: queryAllFeedback ─────────────────────────────────────────────────

describe('queryAllFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all rows ordered by createdAt descending', async () => {
    const rows = [
      makeFeedbackRow({ id: 3, message: 'Third', createdAt: new Date('2025-07-20T12:00:00Z') }),
      makeFeedbackRow({ id: 1, message: 'First', createdAt: new Date('2025-07-19T12:00:00Z') }),
      makeFeedbackRow({ id: 2, message: 'Second', createdAt: new Date('2025-07-20T00:00:00Z') }),
    ];
    selectOrderByMock.mockResolvedValueOnce(rows);

    const result = await queryAllFeedback();

    expect(selectMock).toHaveBeenCalled();
    expect(selectFromMock).toHaveBeenCalled();
    expect(selectOrderByMock).toHaveBeenCalled();
    expect(result).toEqual(rows);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no feedback exists', async () => {
    selectOrderByMock.mockResolvedValueOnce([]);

    const result = await queryAllFeedback();
    expect(result).toEqual([]);
  });
});

// ── Tests: toggleResolved ───────────────────────────────────────────────────

describe('toggleResolved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles resolved from 0 to 1', async () => {
    updateReturningMock.mockResolvedValueOnce([{ resolved: 1 }]);

    const result = await toggleResolved(1);
    expect(result).toBe(1);
    expect(updateSetMock).toHaveBeenCalled();
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('toggles resolved from 1 to 0', async () => {
    updateReturningMock.mockResolvedValueOnce([{ resolved: 0 }]);

    const result = await toggleResolved(1);
    expect(result).toBe(0);
  });

  it('throws when feedback not found', async () => {
    updateReturningMock.mockResolvedValueOnce([]);

    await expect(toggleResolved(999)).rejects.toThrow('Feedback not found');
  });
});

// ── Tests: removeFeedback ────────────────────────────────────────────────────

describe('removeFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the row by id', async () => {
    deleteReturningMock.mockResolvedValueOnce([{ id: 1 }]);

    await removeFeedback(1);

    expect(deleteMock).toHaveBeenCalled();
    expect(deleteWhereMock).toHaveBeenCalled();
  });

  it('throws when feedback not found', async () => {
    deleteReturningMock.mockResolvedValueOnce([]);

    await expect(removeFeedback(999)).rejects.toThrow('Feedback not found');
  });
});
