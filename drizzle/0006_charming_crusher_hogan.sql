CREATE TYPE "public"."schedule_type" AS ENUM('work', 'meeting', 'leave', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."schedule_visibility" AS ENUM('team', 'private');--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE 'schedule_assigned';--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" "schedule_type" DEFAULT 'work' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"visibility" "schedule_visibility" DEFAULT 'team' NOT NULL,
	"project_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_events_user_id_starts_at_idx" ON "schedule_events" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "schedule_events_starts_at_ends_at_idx" ON "schedule_events" USING btree ("starts_at","ends_at");