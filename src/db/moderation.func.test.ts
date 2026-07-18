import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Env snapshot ────────────────────────────────────────────────────────────

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// ── Import after env setup ──────────────────────────────────────────────────

import { moderateImage } from './moderation.func';

// ── Helpers ─────────────────────────────────────────────────────────────────

function setCredentials() {
  process.env.SIGHTENGINE_API_USER = 'test-user';
  process.env.SIGHTENGINE_API_SECRET = 'test-secret';
}

function clearCredentials() {
  delete process.env.SIGHTENGINE_API_USER;
  delete process.env.SIGHTENGINE_API_SECRET;
}

function setFailOpen() {
  process.env.MODERATION_FAIL_OPEN = 'true';
}

function clearFailOpen() {
  delete process.env.MODERATION_FAIL_OPEN;
}

const testBuffer = Buffer.from('fake-image-data');

// ── Tests: moderateImage ────────────────────────────────────────────────────

describe('moderateImage', () => {
  describe('missing credentials', () => {
    it('returns flagged + moderationUnavailable when creds are missing', async () => {
      clearCredentials();
      clearFailOpen();

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(true);
      expect(result.moderationUnavailable).toBe(true);
      expect(result.scores).toEqual({ moderationUnavailable: 1 });
    });

    it('returns not-flagged when MODERATION_FAIL_OPEN=true and creds missing', async () => {
      clearCredentials();
      setFailOpen();

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(false);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores).toEqual({});
    });
  });

  describe('API error', () => {
    it('returns flagged + moderationUnavailable when SightEngine returns failure', async () => {
      setCredentials();
      clearFailOpen();

      const mockFetch = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'failure', error: 'invalid api key' }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(true);
      expect(result.moderationUnavailable).toBe(true);
      expect(result.scores).toEqual({ moderationUnavailable: 1 });
      expect(result.raw).toEqual({ status: 'failure', error: 'invalid api key' });
    });

    it('returns not-flagged when MODERATION_FAIL_OPEN=true and API fails', async () => {
      setCredentials();
      setFailOpen();

      const mockFetch = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'failure', error: 'invalid api key' }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(false);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores).toEqual({});
    });
  });

  describe('network error', () => {
    it('returns flagged + moderationUnavailable when fetch throws', async () => {
      setCredentials();
      clearFailOpen();

      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(true);
      expect(result.moderationUnavailable).toBe(true);
      expect(result.scores).toEqual({ moderationUnavailable: 1 });
    });

    it('returns not-flagged when MODERATION_FAIL_OPEN=true and fetch throws', async () => {
      setCredentials();
      setFailOpen();

      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(false);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores).toEqual({});
    });
  });

  describe('clean image', () => {
    it('returns not-flagged with scores for a clean image', async () => {
      setCredentials();
      clearFailOpen();

      const mockFetch = vi.fn().mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            status: 'success',
            nudity: { raw: 0.01, safe: 0.98, partial: 0.01 },
            weapon: 0.01,
            alcohol: 0.01,
            drugs: 0.01,
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(false);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores).toEqual({
        nudity: 0.01,
        weapons: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
      });
    });
  });

  describe('flagged image', () => {
    it('returns flagged with scores when nudity exceeds threshold', async () => {
      setCredentials();
      clearFailOpen();

      const mockFetch = vi.fn().mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            status: 'success',
            nudity: { raw: 0.85, safe: 0.1, partial: 0.05 },
            weapon: 0.01,
            alcohol: 0.01,
            drugs: 0.01,
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(true);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores.nudity).toBe(0.85);
    });

    it('returns flagged with scores when weapon exceeds threshold', async () => {
      setCredentials();
      clearFailOpen();

      const mockFetch = vi.fn().mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            status: 'success',
            nudity: { raw: 0.01, safe: 0.98, partial: 0.01 },
            weapon: 0.95,
            alcohol: 0.01,
            drugs: 0.01,
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await moderateImage(testBuffer);

      expect(result.flagged).toBe(true);
      expect(result.moderationUnavailable).toBe(false);
      expect(result.scores.weapons).toBe(0.95);
    });
  });
});
