import { seedClient } from './_client'

/**
 * One-off helper to create the `article_media` table.
 *
 * Use this when `drizzle-kit migrate` / `push` can't run (e.g. an out-of-sync
 * migration tracking table). It is idempotent: safe to run multiple times.
 *
 *   pnpm db:create:article-media
 */
console.log('\u{1F527} Ensuring article_media table exists...')

await seedClient`
  CREATE TABLE IF NOT EXISTS "article_media" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "article_id" uuid NOT NULL,
    "type" text DEFAULT 'image' NOT NULL,
    "url" text NOT NULL,
    "public_id" text,
    "poster_url" text,
    "caption_ar" text,
    "caption_fr" text,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )
`

await seedClient`
  DO $$ BEGIN
    ALTER TABLE "article_media"
      ADD CONSTRAINT "article_media_article_id_articles_id_fk"
      FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$
`

// Keep pre-existing tables compatible with the current media schema.
await seedClient`
  ALTER TABLE "article_media" ADD COLUMN IF NOT EXISTS "public_id" text
`
await seedClient`
  ALTER TABLE "article_media" ADD COLUMN IF NOT EXISTS "resource_type" text
`
await seedClient`
  ALTER TABLE "article_media" ADD COLUMN IF NOT EXISTS "image_variants" jsonb
`
await seedClient`
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "cover_image_variants" jsonb
`

console.log('\u2705 article media and image variant columns are ready')

await seedClient.end()
