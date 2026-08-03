CREATE TABLE "mobile_upload_idempotency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response_json" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "mobile_upload_idempotency_user_key_unique" UNIQUE("user_id", "idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "mobile_upload_idempotency_expiry_idx" ON "mobile_upload_idempotency" ("expires_at");
