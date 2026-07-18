ALTER TABLE "blobs" ADD COLUMN "flagged" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "blobs" ADD COLUMN "moderation_scores" jsonb;