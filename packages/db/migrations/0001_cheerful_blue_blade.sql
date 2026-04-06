CREATE TABLE "bootstrap_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bootstrap_files_company_file_unique" UNIQUE("company_id","file_name")
);
--> statement-breakpoint
ALTER TABLE "bootstrap_files" ADD CONSTRAINT "bootstrap_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bootstrap_files_company_id_idx" ON "bootstrap_files" USING btree ("company_id");