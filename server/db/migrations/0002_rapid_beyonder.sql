ALTER TABLE "comment_flags" ALTER COLUMN "comment_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "comment_votes" ALTER COLUMN "comment_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "parent_id" SET DATA TYPE uuid;