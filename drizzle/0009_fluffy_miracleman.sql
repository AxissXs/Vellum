CREATE TABLE "activity_log_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"snapshot" text NOT NULL,
	"snapshot_type" text DEFAULT 'after' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "severity" text DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_ip" text;--> statement-breakpoint
ALTER TABLE "activity_log_snapshots" ADD CONSTRAINT "activity_log_snapshots_log_id_activity_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."activity_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_snapshots_log_id_idx" ON "activity_log_snapshots" USING btree ("log_id");