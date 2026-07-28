-- Reading list: one row = "this user saved this article".
-- Source of truth for the shape is server/db/schema/bookmarks.ts.
--
-- Idempotent so a database that already received the table (for example from
-- `drizzle-kit push`) converges instead of aborting the whole migration run.
--
-- The foreign keys are declared INLINE rather than added by a later
-- ALTER TABLE: this database is CockroachDB, which has no anonymous PL/pgSQL
-- DO block to make a bare ADD CONSTRAINT repeatable, but a CREATE TABLE
-- IF NOT EXISTS carrying its own constraints is safe to re-run.
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "bookmarks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_user_article_idx" ON "bookmarks" USING btree ("user_id","article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmarks_user_idx" ON "bookmarks" USING btree ("user_id");
