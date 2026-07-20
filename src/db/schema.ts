import { eq } from 'drizzle-orm';
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// ── Profiles ────────────────────────────────────────────────────────────────
// App-specific user metadata. Clerk owns the user identity; this table
// extends it with upload limits, approval status, and ban state.

export const profiles = pgTable(
  'profiles',
  {
    clerkUserId: text('clerk_user_id').primaryKey(),
    uploadCountToday: integer('upload_count_today').notNull().default(0),
    lastUploadDate: date('last_upload_date'),
    approved: integer('approved').notNull().default(0), // 0 = default, 1 = approved
    banned: integer('banned').notNull().default(0), // 0 = active, 1 = banned
    isAdmin: integer('is_admin').notNull().default(0), // 0 = regular user, 1 = admin
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('profiles_last_upload_date_idx').on(table.lastUploadDate)],
);

// ── Blobs ───────────────────────────────────────────────────────────────────
// A "blob of doom" — a 3D-printing failure submitted by a user.

export const blobs = pgTable(
  'blobs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    description: text('description'),
    dateOccurred: date('date_occurred').notNull(),
    filamentType: text('filament_type').notNull(),
    machineUsed: text('machine_used').notNull(),
    imageThumbnailUrl: text('image_thumbnail_url').notNull(),
    imageMediumUrl: text('image_medium_url').notNull(),
    imageFullUrl: text('image_full_url').notNull(),
    uploaderProfileId: text('uploader_profile_id')
      .notNull()
      .references(() => profiles.clerkUserId),
    viewCount: integer('view_count').notNull().default(0),
    deleted: integer('deleted').notNull().default(0), // 0 = active, 1 = soft-deleted
    flagged: integer('flagged').notNull().default(0), // 0 = clean, 1 = flagged for review
    moderationScores: jsonb('moderation_scores').$type<Record<string, number>>(), // SightEngine moderation results
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('blobs_uploader_profile_id_idx').on(table.uploaderProfileId),
    index('blobs_created_at_idx').on(table.createdAt),
    index('blobs_deleted_idx').on(table.deleted).where(eq(table.deleted, 0)),
    index('blobs_flagged_idx').on(table.flagged).where(eq(table.flagged, 0)),
  ],
);

// ── Feedback ───────────────────────────────────────────────────────────────
// Site feedback submissions (bug reports and feature requests).

export const feedback = pgTable('feedback', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  category: text('category').notNull(), // 'bug' | 'feature'
  message: text('message').notNull(),
  email: text('email'), // nullable — populated from Clerk if signed in, or optional anonymous field
  submitterProfileId: text('submitter_profile_id').references(() => profiles.clerkUserId), // null for anonymous
  submitterProvider: text('submitter_provider'), // e.g. 'google', 'github', 'discord' — null for anonymous
  submitterIp: text('submitter_ip'), // client IP — used for anonymous rate limiting
  resolved: integer('resolved').notNull().default(0), // 0 = open, 1 = resolved
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Ratings ─────────────────────────────────────────────────────────────────
// Doom Scale ratings (1–5 hexagons). One rating per user per blob.

export const ratings = pgTable(
  'ratings',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    blobId: integer('blob_id')
      .notNull()
      .references(() => blobs.id, { onDelete: 'cascade' }),
    raterProfileId: text('rater_profile_id')
      .notNull()
      .references(() => profiles.clerkUserId),
    score: integer('score').notNull(), // 1–5
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('ratings_blob_rater_idx').on(table.blobId, table.raterProfileId)],
);
