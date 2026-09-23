CREATE TABLE "sessions" (
	"owner_id" text NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"snapshot_version" integer NOT NULL,
	"browser_state" jsonb NOT NULL,
	"track_state" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_owner_id_id_pk" PRIMARY KEY("owner_id","id"),
	CONSTRAINT "sessions_name_not_blank" CHECK (length(trim("sessions"."name")) > 0),
	CONSTRAINT "sessions_revision_positive" CHECK ("sessions"."revision" > 0),
	CONSTRAINT "sessions_snapshot_version" CHECK ("sessions"."snapshot_version" = 1)
);
--> statement-breakpoint
CREATE INDEX "sessions_owner_updated_idx" ON "sessions" USING btree ("owner_id","updated_at" DESC NULLS LAST);