CREATE TYPE "public"."activity_event_type" AS ENUM('skill_run', 'gate_created', 'gate_approved', 'gate_rejected', 'memory_update', 'skill_installed', 'member_invited', 'heartbeat_run');
--> statement-breakpoint
CREATE TABLE "activity_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"event_type" "activity_event_type" NOT NULL,
	"agent_name" text,
	"skill_name" text,
	"actor" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_feed_company_id_idx" ON "activity_feed" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "activity_feed_company_event_type_idx" ON "activity_feed" USING btree ("company_id","event_type");
--> statement-breakpoint
CREATE INDEX "activity_feed_company_created_at_idx" ON "activity_feed" USING btree ("company_id","created_at");
