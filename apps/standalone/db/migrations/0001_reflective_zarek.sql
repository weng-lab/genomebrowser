CREATE TABLE "custom_tracks" (
	"owner_id" text NOT NULL,
	"id" uuid NOT NULL,
	"assembly_id" text NOT NULL,
	"track" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_tracks_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE INDEX "custom_tracks_owner_assembly_idx" ON "custom_tracks" USING btree ("owner_id","assembly_id");