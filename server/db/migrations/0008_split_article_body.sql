-- Split the shared articles.body into per-language columns (AR / FR).
-- Existing content is copied into BOTH columns so nothing is lost; editors
-- can then replace each side with the proper translation.
ALTER TABLE "articles" ADD COLUMN "body_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "body_fr" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "articles" SET "body_ar" = "body", "body_fr" = "body";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "body";