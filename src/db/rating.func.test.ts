import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────────────────

const {
  updateSetMock,
  updateWhereAndMock,
  updateReturningMock,
  updateMock,
  insertValuesMock,
  insertReturningMock,
  insertMock,
  selectFromMock,
  selectWhereMock,
  selectMock,
} = vi.hoisted(() => {
  const updateSetMock = vi.fn()
  const updateWhereAndMock = vi.fn()
  const updateReturningMock = vi.fn()
  const updateMock = vi.fn().mockReturnValue({
    set: updateSetMock.mockReturnValue({
      where: updateWhereAndMock.mockReturnValue({
        returning: updateReturningMock,
      }),
    }),
  })

  const insertValuesMock = vi.fn()
  const insertReturningMock = vi.fn()
  const insertMock = vi.fn().mockReturnValue({
    values: insertValuesMock.mockReturnValue({
      returning: insertReturningMock,
    }),
  })

  const selectFromMock = vi.fn()
  const selectWhereMock = vi.fn()
  const selectMock = vi.fn().mockReturnValue({
    from: selectFromMock.mockReturnValue({
      where: selectWhereMock,
    }),
  })

  return {
    updateSetMock,
    updateWhereAndMock,
    updateReturningMock,
    insertValuesMock,
    insertReturningMock,
    selectFromMock,
    selectWhereMock,
    updateMock,
    insertMock,
    selectMock,
  }
})

vi.mock('./index', () => ({
  db: {
    update: updateMock,
    insert: insertMock,
    select: selectMock,
  },
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

import {
  validateRatingInput,
  upsertRating,
  calculateAverage,
} from './rating.func'

// ── Tests: validateRatingInput ──────────────────────────────────────────────

describe('validateRatingInput', () => {
  it('returns clean data for valid input', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 3 })
    expect(error).toBeNull()
    expect(data).toEqual({ blobId: 1, score: 3 })
  })

  it('rejects non-object input', () => {
    expect(validateRatingInput(null).error).toBe('Invalid input')
    expect(validateRatingInput(undefined).error).toBe('Invalid input')
    expect(validateRatingInput('foo').error).toBe('Invalid input')
    expect(validateRatingInput(42).error).toBe('Invalid input')
  })

  it('rejects missing blobId', () => {
    const { data, error } = validateRatingInput({ score: 3 })
    expect(data).toBeNull()
    expect(error).toBe('Invalid blob ID')
  })

  it('rejects non-integer blobId', () => {
    const { data, error } = validateRatingInput({ blobId: 1.5, score: 3 })
    expect(data).toBeNull()
    expect(error).toBe('Invalid blob ID')
  })

  it('rejects blobId < 1', () => {
    const { data, error } = validateRatingInput({ blobId: 0, score: 3 })
    expect(data).toBeNull()
    expect(error).toBe('Invalid blob ID')
  })

  it('rejects missing score', () => {
    const { data, error } = validateRatingInput({ blobId: 1 })
    expect(data).toBeNull()
    expect(error).toBe('Score must be an integer between 1 and 5')
  })

  it('rejects score < 1', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 0 })
    expect(data).toBeNull()
    expect(error).toBe('Score must be an integer between 1 and 5')
  })

  it('rejects score > 5', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 6 })
    expect(data).toBeNull()
    expect(error).toBe('Score must be an integer between 1 and 5')
  })

  it('rejects non-integer score', () => {
    const { data, error } = validateRatingInput({ blobId: 1, score: 3.5 })
    expect(data).toBeNull()
    expect(error).toBe('Score must be an integer between 1 and 5')
  })

  it('accepts boundary scores 1 and 5', () => {
    expect(validateRatingInput({ blobId: 1, score: 1 }).error).toBeNull()
    expect(validateRatingInput({ blobId: 1, score: 5 }).error).toBeNull()
  })
})

// ── Tests: upsertRating ─────────────────────────────────────────────────────

describe('upsertRating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a new rating when no existing rating found', async () => {
    // Update returns empty (no existing rating)
    updateReturningMock.mockResolvedValueOnce([])
    // Insert returns the new row
    insertReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await upsertRating(1, 'user_1', 4)

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ score: 4 }),
    )
    expect(updateWhereAndMock).toHaveBeenCalled()
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        blobId: 1,
        raterProfileId: 'user_1',
        score: 4,
      }),
    )
    expect(result.score).toBe(4)
    expect(result.blobId).toBe(1)
  })

  it('updates an existing rating when one is found', async () => {
    // Update returns the existing row (user changing their rating)
    updateReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await upsertRating(1, 'user_1', 5)

    // Should not call insert
    expect(insertValuesMock).not.toHaveBeenCalled()
    expect(result.score).toBe(5)
  })

  it('updates the updatedAt timestamp on upsert', async () => {
    updateReturningMock.mockResolvedValueOnce([
      {
        id: 1,
        blobId: 1,
        raterProfileId: 'user_1',
        score: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-15'),
      },
    ])

    const result = await upsertRating(1, 'user_1', 3)
    expect(result.updatedAt).toBeInstanceOf(Date)
  })
})

// ── Tests: calculateAverage ─────────────────────────────────────────────────

describe('calculateAverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 average and 0 count when no ratings exist', async () => {
    selectWhereMock.mockResolvedValueOnce([
      { averageRating: 0, ratingCount: 0 },
    ])

    const result = await calculateAverage(1)
    expect(result).toEqual({ averageRating: 0, ratingCount: 0 })
  })

  it('returns correct average for a single rating', async () => {
    selectWhereMock.mockResolvedValueOnce([
      { averageRating: 4, ratingCount: 1 },
    ])

    const result = await calculateAverage(1)
    expect(result).toEqual({ averageRating: 4, ratingCount: 1 })
  })

  it('returns correct average for multiple ratings', async () => {
    selectWhereMock.mockResolvedValueOnce([
      { averageRating: 3.5, ratingCount: 4 },
    ])

    const result = await calculateAverage(1)
    expect(result).toEqual({ averageRating: 3.5, ratingCount: 4 })
  })

  it('returns 0/0 for empty result set (should not happen in practice)', async () => {
    selectWhereMock.mockResolvedValueOnce([])

    const result = await calculateAverage(1)
    expect(result).toEqual({ averageRating: 0, ratingCount: 0 })
  })
})
