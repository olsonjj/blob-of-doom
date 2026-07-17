import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so mock functions are available in the hoisted vi.mock factory
const { orderByMock, groupByMock, leftJoinMock, fromMock, selectMock } = vi.hoisted(() => {
  const orderByMock = vi.fn().mockReturnValue(Promise.resolve([]))
  const groupByMock = vi.fn().mockReturnValue({ orderBy: orderByMock })
  const leftJoinMock = vi.fn().mockReturnValue({ groupBy: groupByMock })
  const fromMock = vi.fn().mockReturnValue({ leftJoin: leftJoinMock })
  const selectMock = vi.fn().mockReturnValue({ from: fromMock })

  return { orderByMock, groupByMock, leftJoinMock, fromMock, selectMock }
})

vi.mock('./index', () => ({
  db: {
    select: selectMock,
  },
}))

import { parseGalleryParams, queryGallery } from './gallery.func'

describe('parseGalleryParams', () => {
  it('defaults to date desc when given empty input', () => {
    expect(parseGalleryParams({})).toEqual({ sort: 'date', order: 'desc' })
  })

  it('parses sort=date&order=asc', () => {
    expect(parseGalleryParams({ sort: 'date', order: 'asc' })).toEqual({
      sort: 'date',
      order: 'asc',
    })
  })

  it('parses sort=doom&order=desc', () => {
    expect(parseGalleryParams({ sort: 'doom', order: 'desc' })).toEqual({
      sort: 'doom',
      order: 'desc',
    })
  })

  it('parses sort=doom&order=asc', () => {
    expect(parseGalleryParams({ sort: 'doom', order: 'asc' })).toEqual({
      sort: 'doom',
      order: 'asc',
    })
  })

  it('ignores invalid sort values and defaults to date', () => {
    expect(parseGalleryParams({ sort: 'invalid', order: 'desc' })).toEqual({
      sort: 'date',
      order: 'desc',
    })
  })

  it('ignores invalid order values and defaults to desc', () => {
    expect(parseGalleryParams({ sort: 'date', order: 'invalid' })).toEqual({
      sort: 'date',
      order: 'desc',
    })
  })
})

describe('queryGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    orderByMock.mockReturnValue(Promise.resolve([]))
  })

  it('calls the query builder with date desc by default', async () => {
    await queryGallery({ sort: 'date', order: 'desc' })

    expect(selectMock).toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalled()
    expect(leftJoinMock).toHaveBeenCalled()
    expect(groupByMock).toHaveBeenCalled()
    expect(orderByMock).toHaveBeenCalled()
  })

  it('calls the query builder for each sort combination', async () => {
    const combos: Array<{ sort: 'date' | 'doom'; order: 'asc' | 'desc' }> = [
      { sort: 'date', order: 'asc' },
      { sort: 'date', order: 'desc' },
      { sort: 'doom', order: 'asc' },
      { sort: 'doom', order: 'desc' },
    ]

    for (const combo of combos) {
      vi.clearAllMocks()
      orderByMock.mockReturnValue(Promise.resolve([]))
      await queryGallery(combo)
      expect(orderByMock).toHaveBeenCalled()
    }
  })

  it('returns the data from the database', async () => {
    const mockBlobs = [
      {
        id: 1,
        title: 'Test Blob',
        description: 'A test',
        dateOccurred: '2024-01-01',
        filamentType: 'PLA',
        machineUsed: 'Ender 3',
        imageThumbnailUrl: 'https://example.com/thumb.jpg',
        imageMediumUrl: 'https://example.com/med.jpg',
        imageFullUrl: 'https://example.com/full.jpg',
        uploaderProfileId: 'user_1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        averageRating: 3.5,
        ratingCount: 2,
      },
    ]
    orderByMock.mockReturnValue(Promise.resolve(mockBlobs))

    const result = await queryGallery({ sort: 'date', order: 'desc' })
    expect(result).toEqual(mockBlobs)
  })
})
