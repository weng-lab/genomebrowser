import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const accountSettingsTable = pgTable("account_settings", {
  userId: text("user_id").primaryKey(),
  remoteControlEnabled: boolean("remote_control_enabled").notNull().default(true),
});
