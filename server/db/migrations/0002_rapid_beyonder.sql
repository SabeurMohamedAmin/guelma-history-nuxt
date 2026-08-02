-- Convert the modern comment tree to UUIDs while preserving relationships.
ALTER TABLE "comment_flags" DROP CONSTRAINT IF EXISTS "comment_flags_comment_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comment_votes" DROP CONSTRAINT IF EXISTS "comment_votes_comment_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_parent_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "comment_flags" ALTER COLUMN "comment_id" SET DATA TYPE uuid USING (md5('comments:' || "comment_id"::STRING)::UUID);
--> statement-breakpoint
ALTER TABLE "comment_votes" ALTER COLUMN "comment_id" SET DATA TYPE uuid USING (md5('comments:' || "comment_id"::STRING)::UUID);
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "parent_id" SET DATA TYPE uuid USING (CASE WHEN "parent_id" IS NULL THEN NULL ELSE md5('comments:' || "parent_id"::STRING)::UUID END);
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" SET DATA TYPE uuid USING (md5('comments:' || "id"::STRING)::UUID);
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
