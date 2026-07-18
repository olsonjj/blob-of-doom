// ── Types ───────────────────────────────────────────────────────────────────

export interface ModerationResult {
  flagged: boolean;
  scores: Record<string, number>;
  raw: Record<string, unknown>;
  moderationUnavailable: boolean;
}

// ── Thresholds ──────────────────────────────────────────────────────────────

// Maps our internal category names to SightEngine response keys.
// SightEngine returns: nudity (object with .raw), weapon (number), alcohol (number), drugs (number)
const CATEGORY_MAP: Record<string, { key: string; extract: (data: Record<string, unknown>) => number | undefined }> = {
  nudity: {
    key: 'nudity',
    extract: (data) => {
      const nudity = data['nudity'] as Record<string, number> | undefined;
      return nudity?.raw;
    },
  },
  weapons: {
    key: 'weapon',
    extract: (data) => {
      const val = data['weapon'];
      return typeof val === 'number' ? val : undefined;
    },
  },
  alcohol: {
    key: 'alcohol',
    extract: (data) => {
      const val = data['alcohol'];
      return typeof val === 'number' ? val : undefined;
    },
  },
  drugs: {
    key: 'drugs',
    extract: (data) => {
      const val = data['drugs'];
      return typeof val === 'number' ? val : undefined;
    },
  },
};

const THRESHOLDS: Record<string, number> = {
  nudity: 0.6,
  weapons: 0.7,
  alcohol: 0.7,
  drugs: 0.7,
};

// ── Moderation helper ───────────────────────────────────────────────────────

/**
 * Send an image buffer to SightEngine for moderation.
 * Returns whether the image was flagged and the full scores.
 *
 * When SightEngine is unreachable or returns an error, the image is
 * flagged and `moderationUnavailable` is set to true so the upload
 * is quarantined for admin review rather than silently published.
 *
 * Set `MODERATION_FAIL_OPEN=true` to restore the old fail-open
 * behavior during extended SightEngine outages.
 */
export async function moderateImage(buffer: Buffer): Promise<ModerationResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  const failOpen = process.env.MODERATION_FAIL_OPEN === 'true';

  if (!apiUser || !apiSecret) {
    console.warn('SightEngine credentials not configured — quarantining upload');
    return {
      flagged: failOpen ? false : true,
      scores: failOpen ? {} : { moderationUnavailable: 1 },
      raw: {},
      moderationUnavailable: !failOpen,
    };
  }

  try {
    const formData = new FormData();
    formData.append('api_user', apiUser);
    formData.append('api_secret', apiSecret);
    formData.append('models', 'nudity,wad');
    formData.append('media', new Blob([buffer]), 'image.jpg');

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    });

    const result = (await response.json()) as Record<string, unknown>;

    // Check for API errors
    if (result.status === 'failure') {
      console.error('SightEngine API error:', result.error);
      return {
        flagged: failOpen ? false : true,
        scores: failOpen ? {} : { moderationUnavailable: 1 },
        raw: result,
        moderationUnavailable: !failOpen,
      };
    }

    // Extract scores from the result.
    // SightEngine returns: nudity as { raw, safe, partial }, weapon/alcohol/drugs as direct numbers
    const scores: Record<string, number> = {};
    let flagged = false;

    for (const [category, threshold] of Object.entries(THRESHOLDS)) {
      const mapping = CATEGORY_MAP[category];
      if (!mapping) continue;
      const prob = mapping.extract(result);
      if (typeof prob === 'number') {
        scores[category] = prob;
        if (prob >= threshold) {
          flagged = true;
        }
      }
    }

    return { flagged, scores, raw: result, moderationUnavailable: false };
  } catch (err) {
    console.error('SightEngine moderation failed:', err);
    return {
      flagged: failOpen ? false : true,
      scores: failOpen ? {} : { moderationUnavailable: 1 },
      raw: {},
      moderationUnavailable: !failOpen,
    };
  }
}
