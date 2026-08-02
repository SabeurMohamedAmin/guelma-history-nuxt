CREATE TABLE "newsletter_article_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "confirmation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "unsubscribe_token_hash" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "last_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "newsletter_article_emails" ADD CONSTRAINT "newsletter_article_emails_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_article_emails" ADD CONSTRAINT "newsletter_article_emails_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_article_emails_article_subscriber_uidx" ON "newsletter_article_emails" USING btree ("article_id","subscriber_id");--> statement-breakpoint
CREATE INDEX "newsletter_article_emails_article_idx" ON "newsletter_article_emails" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "newsletter_article_emails_subscriber_idx" ON "newsletter_article_emails" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscribers_token_hash_idx" ON "subscribers" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "subscribers_unsubscribe_token_hash_idx" ON "subscribers" USING btree ("unsubscribe_token_hash");--> statement-breakpoint
CREATE INDEX "subscribers_status_token_expires_idx" ON "subscribers" USING btree ("status","token_expires_at");--> statement-breakpoint
ALTER TABLE "subscribers" DROP COLUMN "confirmed";