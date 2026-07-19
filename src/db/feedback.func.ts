import { createServerFn } from '@tanstack/react-start';

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
): Promise<FeedbackRow> {
  const { db } = await import('./index');
  const { feedback } = await import('./schema');

  const [row] = await db
    .insert(feedback)
    .values({
      category,
      message,
      email,
      submitterProfileId,
      submitterProvider,
    })
    .returning();

  return row as FeedbackRow;
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

    return insertFeedback(data.category, data.message, email, submitterProfileId, submitterProvider);
  });

// ── Admin auth helper ───────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const { db } = await import('./index');
  const { profiles } = await import('./schema');
  const { eq } = await import('drizzle-orm');
  const [profile] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  if (profile?.isAdmin !== 1) throw new Error('Admin access required');
  return userId;
}

// ── Query all feedback (extracted for testability) ──────────────────────────

export async function queryAllFeedback(): Promise<FeedbackRow[]> {
  const { db } = await import('./index');
  const { feedback } = await import('./schema');
  const { desc } = await import('drizzle-orm');

  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return rows as FeedbackRow[];
}

// ── Toggle resolved (extracted for testability) ─────────────────────────────

export async function toggleResolved(feedbackId: number): Promise<number> {
  const { db } = await import('./index');
  const { feedback } = await import('./schema');
  const { eq, sql } = await import('drizzle-orm');

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
  const { db } = await import('./index');
  const { feedback } = await import('./schema');
  const { eq } = await import('drizzle-orm');

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
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).feedbackId !== 'number') {
      throw new Error('feedbackId is required');
    }
    return d as { feedbackId: number };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const resolved = await toggleResolved(data.feedbackId);
    return { resolved: resolved === 1 };
  });

export const deleteFeedback = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).feedbackId !== 'number') {
      throw new Error('feedbackId is required');
    }
    return d as { feedbackId: number };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await removeFeedback(data.feedbackId);
    return { success: true };
  });
