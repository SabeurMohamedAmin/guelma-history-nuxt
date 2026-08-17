-- Bilingual alternative text for gallery media.
--
-- Both editors already send `altAr` / `altFr` and `mediaItemSchema` already
-- accepts them, but the columns never existed, so every value was silently
-- dropped on save.
--
-- Nullable on purpose: existing rows carry no alt text, and a decorative image
-- may legitimately have none.
ALTER TABLE "article_media" ADD COLUMN "alt_ar" text;--> statement-breakpoint
ALTER TABLE "article_media" ADD COLUMN "alt_fr" text;
