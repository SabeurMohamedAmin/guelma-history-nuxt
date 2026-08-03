CREATE TABLE "mobile_admin_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "token_family_id" uuid NOT NULL,
  "device_id" text NOT NULL,
  "device_name" text,
  "platform" text NOT NULL,
  "app_version" text,
  "last_used_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "replaced_by_session_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "mobile_admin_sessions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "mobile_admin_sessions_replaced_by_session_id_fk"
    FOREIGN KEY ("replaced_by_session_id") REFERENCES "mobile_admin_sessions"("id") ON DELETE SET NULL,
  CONSTRAINT "mobile_admin_sessions_platform_check"
    CHECK ("platform" IN ('android', 'ios'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_admin_sessions_token_hash_idx" ON "mobile_admin_sessions" ("token_hash");
--> statement-breakpoint
CREATE INDEX "mobile_admin_sessions_user_idx" ON "mobile_admin_sessions" ("user_id");
--> statement-breakpoint
CREATE INDEX "mobile_admin_sessions_family_idx" ON "mobile_admin_sessions" ("token_family_id");
--> statement-breakpoint
CREATE INDEX "mobile_admin_sessions_device_idx" ON "mobile_admin_sessions" ("user_id", "device_id");
--> statement-breakpoint
CREATE INDEX "mobile_admin_sessions_expiry_idx" ON "mobile_admin_sessions" ("expires_at");
