import { boolean, pgTable, text } from "drizzle-orm/pg-core";

/** Saved preferences. An account without a row has the default settings. */
export const accountSettingsTable = pgTable("account_settings", {
  /** Clerk user ID. */
  userId: text("user_id").primaryKey(),
  remoteControl: boolean("remote_control").notNull().default(true),
});
