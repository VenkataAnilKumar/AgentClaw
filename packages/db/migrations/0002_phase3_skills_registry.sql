CREATE TABLE "installed_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"skill_name" text NOT NULL,
	"version" text NOT NULL DEFAULT '1.0.0',
	"category" text NOT NULL,
	"agent_affinity" text[] NOT NULL DEFAULT '{}',
	"required_integrations" text[] NOT NULL DEFAULT '{}',
	"secrets_configured" text[] NOT NULL DEFAULT '{}',
	"enabled" boolean NOT NULL DEFAULT true,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installed_skills_company_skill_unique" UNIQUE("company_id","skill_name")
);
--> statement-breakpoint
ALTER TABLE "installed_skills" ADD CONSTRAINT "installed_skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "installed_skills_company_id_idx" ON "installed_skills" USING btree ("company_id");
