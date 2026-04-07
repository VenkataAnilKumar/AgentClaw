CREATE TABLE "team_memory_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"actor" text NOT NULL,
	"source" text NOT NULL,
	"action" text NOT NULL DEFAULT 'set',
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_memory_audit" ADD CONSTRAINT "team_memory_audit_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "team_memory_audit_company_id_idx" ON "team_memory_audit" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "team_memory_audit_company_created_at_idx" ON "team_memory_audit" USING btree ("company_id","created_at");
