ALTER TABLE "sessions" ADD COLUMN "recent_save_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE "sessions" SET "recent_save_ids" = ARRAY["save_id"] WHERE "save_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "save_id";
