CREATE TABLE "feedback" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category" text NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"submitter_profile_id" text,
	"resolved" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submitter_profile_id_profiles_clerk_user_id_fk" FOREIGN KEY ("submitter_profile_id") REFERENCES "public"."profiles"("clerk_user_id") ON DELETE no action ON UPDATE no action;