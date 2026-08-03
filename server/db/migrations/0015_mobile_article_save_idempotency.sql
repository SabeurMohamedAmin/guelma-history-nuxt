CREATE TABLE "mobile_article_save_idempotency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response_json" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "mobile_article_save_user_key_unique" UNIQUE("user_id", "idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "mobile_article_save_expiry_idx" ON "mobile_article_save_idempotency" ("expires_at");
--> statement-breakpoint
CREATE INDEX "mobile_article_save_article_idx" ON "mobile_article_save_idempotency" ("article_id");
