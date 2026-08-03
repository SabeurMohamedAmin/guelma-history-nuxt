ALTER TABLE "articles" ADD COLUMN "last_saved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "last_saved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "articles_last_saved_by_user_idx" ON "articles" ("last_saved_by_user_id");
