ALTER TABLE "articles" ADD COLUMN "cover_image_variants" jsonb;
ALTER TABLE "articles" ADD COLUMN "home_position" integer;
ALTER TABLE "article_media" ADD COLUMN "image_variants" jsonb;

CREATE UNIQUE INDEX "articles_home_position_unique"
ON "articles" ("home_position")
WHERE "home_position" IS NOT NULL;

ALTER TABLE "articles"
ADD CONSTRAINT "articles_home_position_check"
CHECK ("home_position" IS NULL OR "home_position" BETWEEN 0 AND 3);
