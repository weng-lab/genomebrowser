ALTER TABLE "agent_threads" ALTER COLUMN "conversation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD COLUMN "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;