CREATE TABLE "telegram_bot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"flow" text NOT NULL,
	"step" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_bot_sessions" ADD CONSTRAINT "telegram_bot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_bot_sessions_chat_id_idx" ON "telegram_bot_sessions" USING btree ("chat_id");