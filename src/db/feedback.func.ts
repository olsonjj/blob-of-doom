import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { requireAdmin } from './auth-guards.func';
import { db } from './index';
import { feedback } from './schema';
import { assertNumber, assertObject } from './validation';

// ── Types ───────────────────────────────────────────────────────────────────

export interface FeedbackSubmission {
  category: 'bug' | 'feature';
  message: string;
  email?: string | null;
}

export interface FeedbackRow {
  id: number;
  category: string;
  message: string;
  email: string | null;
  submitterProfileId: string | null;
  submitterProvider: string | null;
  submitterIp: string | null;
  resolved: number;
  createdAt: Date;
}

// ── Validation (extracted for testability) ──────────────────────────────────

export interface ValidationResult {
  data: FeedbackSubmission | null;
  error: string | null;
}

export function validateFeedbackInput(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { data: null, error: 'Invalid input' };
  }

  const d = input as Record<string, unknown>;

  // category
  if (d.category !== 'bug' && d.category !== 'feature') {
    return { data: null, error: 'Category must be "bug" or "feature"' };
  }

  // message
  if (typeof d.message !== 'string' || d.message.trim().length === 0) {
    return { data: null, error: 'Message is required' };
  }
  if (d.message.length > 500) {
    return { data: null, error: 'Message must be 500 characters or fewer' };
  }

  // email (optional)
  let email: string | null = null;
  if (d.email !== undefined && d.email !== null) {
    if (typeof d.email !== 'string') {
      return { data: null, error: 'Email must be a string' };
    }
    const trimmed = d.email.trim();
    if (trimmed.length > 0) {
      // Basic email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return { data: null, error: 'Invalid email format' };
      }
      email = trimmed;
    }
  }

  return {
    data: {
      category: d.category as 'bug' | 'feature',
      message: d.message.trim(),
      email,
    },
    error: null,
  };
}

// ── Insert (extracted for testability) ──────────────────────────────────────

export async function insertFeedback(
  category: 'bug' | 'feature',
  message: string,
  email: string | null,
  submitterProfileId: string | null,
  submitterProvider: string | null,
  submitterIp: string | null,
): Promise<FeedbackRow> {
  const [row] = await db
    .insert(feedback)
    .values({
      category,
      message,
      email,
      submitterProfileId,
      submitterProvider,
      submitterIp,
    })
    .returning();

  return row;
}

// ── Rate limiting (extracted for testability) ───────────────────────────────

/** Maximum feedback submissions per identity per hour. */
export const FEEDBACK_RATE_LIMIT = 5;

/**
 * Check whether the submitter has exceeded the feedback rate limit.
 *
 * Authenticated users are rate-limited by `submitterProfileId`;
 * anonymous users are rate-limited by IP.
 *
 * Throws with a user-friendly message if the limit is reached.
 * Returns the current count otherwise.
 */
export async function checkFeedbackRateLimit(
  submitterProfileId: string | null,
  ip: string | null,
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  let count: number;
  if (submitterProfileId) {
    // Authenticated user — count by profile ID
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(
        and(
          eq(feedback.submitterProfileId, submitterProfileId),
          gte(feedback.createdAt, oneHourAgo),
        ),
      );
    count = Number(rows[0]?.count ?? 0);
  } else if (ip) {
    // Anonymous user — count by IP
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(
        and(
          eq(feedback.submitterIp, ip),
          gte(feedback.createdAt, oneHourAgo),
        ),
      );
    count = Number(rows[0]?.count ?? 0);
  } else {
    // No identity to rate-limit by — allow the submission
    return 0;
  }

  if (count >= FEEDBACK_RATE_LIMIT) {
    throw new Error(
      'You\'ve submitted a lot of feedback recently. Please wait a bit before sending more — we want to make sure every submission gets proper attention.',
    );
  }

  return count;
}

// ── Server function ─────────────────────────────────────────────────────────

export const submitFeedback = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const { data, error } = validateFeedbackInput(d);
    if (error || !data) throw new Error(error ?? 'Invalid input');
    return data;
  })
  .handler(async ({ data }) => {
    // Determine submitter identity from Clerk
    let submitterProfileId: string | null = null;
    let email: string | null = data.email ?? null;
    let submitterProvider: string | null = null;

    try {
      const { auth } = await import('@clerk/tanstack-react-start/server');
      const session = await auth();
      if (session.userId) {
        submitterProfileId = session.userId;

        // Use Clerk email if signed in (overrides any anonymous email field)
        const { clerkClient } = await import('@clerk/tanstack-react-start/server');
        const client = clerkClient();
        const user = await client.users.getUser(session.userId);
        const primaryEmail = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
        email = primaryEmail?.emailAddress ?? email;

        // Capture OAuth provider (e.g. 'google', 'github', 'discord')
        const externalAccount = user.externalAccounts?.[0];
        if (externalAccount) {
          // Clerk returns 'oauth_google' — strip prefix for display
          submitterProvider = externalAccount.provider?.replace(/^oauth_/, '') ?? null;
        }
      }
    } catch {
      // Auth not available (e.g., in tests) — proceed with whatever we have
    }

    // Get client IP for anonymous rate limiting
    let submitterIp: string | null = null;
    try {
      const { getRequestIP } = await import('@tanstack/start-server-core');
      submitterIp = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      // getRequestIP not available (e.g., in tests) — proceed without IP
    }

    // Rate limit check — throws with friendly message if exceeded
    await checkFeedbackRateLimit(submitterProfileId, submitterIp);

    return insertFeedback(data.category, data.message, email, submitterProfileId, submitterProvider, submitterIp);
  });

// ── Query all feedback (extracted for testability) ──────────────────────────

export async function queryAllFeedback(): Promise<FeedbackRow[]> {
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return rows;
}

// ── Toggle resolved (extracted for testability) ─────────────────────────────

export async function toggleResolved(feedbackId: number): Promise<number> {
  // Toggle: if 0 → 1, if 1 → 0
  const [updated] = await db
    .update(feedback)
    .set({ resolved: sql`CASE WHEN ${feedback.resolved} = 0 THEN 1 ELSE 0 END` } as unknown as { resolved: number })
    .where(eq(feedback.id, feedbackId))
    .returning({ resolved: feedback.resolved });

  if (!updated) throw new Error('Feedback not found');
  return updated.resolved;
}

// ── Delete feedback (extracted for testability) ─────────────────────────────

export async function removeFeedback(feedbackId: number): Promise<void> {
  const [deleted] = await db.delete(feedback).where(eq(feedback.id, feedbackId)).returning({ id: feedback.id });
  if (!deleted) throw new Error('Feedback not found');
}

// ── Admin server functions ──────────────────────────────────────────────────

export const getFeedback = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin();
  return queryAllFeedback();
});

export const resolveFeedback = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { feedbackId: assertNumber(obj, 'feedbackId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const resolved = await toggleResolved(data.feedbackId);
    return { resolved: resolved === 1 };
  });

export const deleteFeedback = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { feedbackId: assertNumber(obj, 'feedbackId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await removeFeedback(data.feedbackId);
    return { success: true };
  });
