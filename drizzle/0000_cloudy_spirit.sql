CREATE TABLE "blobs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blobs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"date_occurred" date NOT NULL,
	"filament_type" text NOT NULL,
	"machine_used" text NOT NULL,
	"image_thumbnail_url" text NOT NULL,
	"image_medium_url" text NOT NULL,
	"image_full_url" text NOT NULL,
	"uploader_profile_id" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"upload_count_today" integer DEFAULT 0 NOT NULL,
	"last_upload_date" date,
	"approved" integer DEFAULT 0 NOT NULL,
	"banned" integer DEFAULT 0 NOT NULL,
	"is_admin" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ratings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"blob_id" integer NOT NULL,
	"rater_profile_id" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blobs" ADD CONSTRAINT "blobs_uploader_profile_id_profiles_clerk_user_id_fk" FOREIGN KEY ("uploader_profile_id") REFERENCES "public"."profiles"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_blob_id_blobs_id_fk" FOREIGN KEY ("blob_id") REFERENCES "public"."blobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_profile_id_profiles_clerk_user_id_fk" FOREIGN KEY ("rater_profile_id") REFERENCES "public"."profiles"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_blob_rater_idx" ON "ratings" USING btree ("blob_id","rater_profile_id");