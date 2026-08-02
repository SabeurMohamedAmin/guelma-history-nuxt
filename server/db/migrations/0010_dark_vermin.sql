-- These columns were introduced by migrations 0008 and 0009. Keep this
-- generated migration safe to run on databases where they already exist.
ALTER TABLE "article_media" ADD COLUMN IF NOT EXISTS "image_variants" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "body_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "body_fr" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "cover_image_variants" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "home_position" integer;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "body";
