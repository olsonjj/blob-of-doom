// ── Types ───────────────────────────────────────────────────────────────────

export interface ModerationResult {
  flagged: boolean
  scores: Record<string, number>
  raw: Record<string, unknown>
}

// ── Thresholds ──────────────────────────────────────────────────────────────

// Maps our internal category names to SightEngine response keys.
// SightEngine returns: nudity (object with .raw), weapon (number), alcohol (number), drugs (number)
const CATEGORY_MAP: Record<string, { key: string; extract: (data: Record<string, unknown>) => number | undefined }> = {
  nudity: {
    key: 'nudity',
    extract: (data) => {
      const nudity = data['nudity'] as Record<string, number> | undefined
      return nudity?.raw
    },
  },
  weapons: {
    key: 'weapon',
    extract: (data) => {
      const val = data['weapon']
      return typeof val === 'number' ? val : undefined
    },
  },
  alcohol: {
    key: 'alcohol',
    extract: (data) => {
      const val = data['alcohol']
      return typeof val === 'number' ? val : undefined
    },
  },
  drugs: {
    key: 'drugs',
    extract: (data) => {
      const val = data['drugs']
      return typeof val === 'number' ? val : undefined
    },
  },
}

const THRESHOLDS: Record<string, number> = {
  nudity: 0.6,
  weapons: 0.7,
  alcohol: 0.7,
  drugs: 0.7,
}

// ── Moderation helper ───────────────────────────────────────────────────────

/**
 * Send an image buffer to SightEngine for moderation.
 * Returns whether the image was flagged and the full scores.
 *
 * If the SightEngine API call fails, returns { flagged: false } so the
 * upload is not blocked (bias toward availability).
 */
export async function moderateImage(buffer: Buffer): Promise<ModerationResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER
  const apiSecret = process.env.SIGHTENGINE_API_SECRET

  if (!apiUser || !apiSecret) {
    console.warn('SightEngine credentials not configured — skipping moderation')
    return { flagged: false, scores: {}, raw: {} }
  }

  try {
    const formData = new FormData()
    formData.append('api_user', apiUser)
    formData.append('api_secret', apiSecret)
    formData.append('models', 'nudity,wad')
    formData.append('media', new Blob([buffer]), 'image.jpg')

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    })

    const result = (await response.json()) as Record<string, unknown>

    // Check for API errors
    if (result.status === 'failure') {
      console.error('SightEngine API error:', result.error)
      return { flagged: false, scores: {}, raw: result }
    }

    // Extract scores from the result.
    // SightEngine returns: nudity as { raw, safe, partial }, weapon/alcohol/drugs as direct numbers
    const scores: Record<string, number> = {}
    let flagged = false

    for (const [category, threshold] of Object.entries(THRESHOLDS)) {
      const mapping = CATEGORY_MAP[category]
      if (!mapping) continue
      const prob = mapping.extract(result)
      if (typeof prob === 'number') {
        scores[category] = prob
        if (prob >= threshold) {
          flagged = true
        }
      }
    }

    return { flagged, scores, raw: result }
  } catch (err) {
    console.error('SightEngine moderation failed:', err)
    return { flagged: false, scores: {}, raw: {} }
  }
}
