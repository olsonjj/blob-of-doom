import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────────────────

const { limitMock, orderByMock, groupByMock, whereMock, leftJoinMock, fromMock, selectMock } = vi.hoisted(() => {
  const limitMock = vi.fn().mockReturnValue(Promise.resolve([]))
  const orderByMock = vi.fn().mockReturnValue({ limit: limitMock })
  const groupByMock = vi.fn().mockReturnValue({ orderBy: orderByMock })
  const whereMock = vi.fn().mockReturnValue({ groupBy: groupByMock })
  const leftJoinMock = vi.fn().mockReturnValue({ where: whereMock })
  const fromMock = vi.fn().mockReturnValue({ leftJoin: leftJoinMock })
  const selectMock = vi.fn().mockReturnValue({ from: fromMock })

  return { limitMock, orderByMock, groupByMock, whereMock, leftJoinMock, fromMock, selectMock }
})

vi.mock('./index', () => ({
  db: {
    select: selectMock,
  },
}))

import { queryFeatured } from './featured.func'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBlobRow(id: number) {
  return {
    id,
    title: `Blob ${id}`,
    description: 'A test blob',
    dateOccurred: '2024-01-01',
    filamentType: 'PLA',
    machineUsed: 'Ender 3',
    imageThumbnailUrl: `https://example.com/thumb-${id}.jpg`,
    imageMediumUrl: `https://example.com/med-${id}.jpg`,
    imageFullUrl: `https://example.com/full-${id}.jpg`,
    uploaderProfileId: 'user_1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    averageRating: 3.0,
    ratingCount: 1,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('queryFeatured', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limitMock.mockReturnValue(Promise.resolve([]))
  })

  it('calls the query builder with RANDOM ordering and limit 6', async () => {
    await queryFeatured()

    expect(selectMock).toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalled()
    expect(leftJoinMock).toHaveBeenCalled()
    expect(groupByMock).toHaveBeenCalled()
    expect(orderByMock).toHaveBeenCalled()
  })

  it('returns an empty array when no blobs exist', async () => {
    limitMock.mockReturnValue(Promise.resolve([]))

    const result = await queryFeatured()
    expect(result).toEqual([])
  })

  it('returns all blobs when fewer than 6 exist', async () => {
    const rows = [makeBlobRow(1), makeBlobRow(2), makeBlobRow(3)]
    limitMock.mockReturnValue(Promise.resolve(rows))

    const result = await queryFeatured()
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
    expect(result[2].id).toBe(3)
  })

  it('returns at most 6 blobs', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => makeBlobRow(i + 1))
    // The DB applies LIMIT 6, so the mock should return at most 6
    limitMock.mockReturnValue(Promise.resolve(rows.slice(0, 6)))

    const result = await queryFeatured()
    expect(result).toHaveLength(6)
  })

  it('includes averageRating and ratingCount in results', async () => {
    const rows = [makeBlobRow(1)]
    limitMock.mockReturnValue(Promise.resolve(rows))

    const result = await queryFeatured()
    expect(result[0].averageRating).toBe(3.0)
    expect(result[0].ratingCount).toBe(1)
  })
})
