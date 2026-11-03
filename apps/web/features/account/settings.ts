import { z } from "zod";

export const accountSettingsSchema = z.strictObject({ remoteControlEnabled: z.boolean() });
export type AccountSettings = z.infer<typeof accountSettingsSchema>;
export const defaultAccountSettings: AccountSettings = { remoteControlEnabled: true };
