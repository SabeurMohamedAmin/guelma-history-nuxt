ALTER TABLE "mobile_admin_sessions" ADD COLUMN IF NOT EXISTS "push_token" text;
--> statement-breakpoint
ALTER TABLE "mobile_admin_sessions" ADD COLUMN IF NOT EXISTS "push_token_provider" text;
