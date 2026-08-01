ALTER TABLE "article_media" ADD COLUMN "image_variants" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "body_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "body_fr" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "cover_image_variants" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "home_position" integer;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "body";