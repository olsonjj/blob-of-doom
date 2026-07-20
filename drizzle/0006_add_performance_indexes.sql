CREATE INDEX "blobs_uploader_profile_id_idx" ON "blobs" USING btree ("uploader_profile_id");--> statement-breakpoint
CREATE INDEX "blobs_created_at_idx" ON "blobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blobs_deleted_idx" ON "blobs" USING btree ("deleted") WHERE "deleted" = 0;--> statement-breakpoint
CREATE INDEX "blobs_flagged_idx" ON "blobs" USING btree ("flagged") WHERE "flagged" = 0;--> statement-breakpoint
CREATE INDEX "profiles_last_upload_date_idx" ON "profiles" USING btree ("last_upload_date");
