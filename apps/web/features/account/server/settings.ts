import "server-only";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { accountSettingsSchema, defaultAccountSettings, type AccountSettings } from "../settings";
import type { Identity } from "./identity";
import { accountSettingsTable } from "./table";

export class AccountSettingsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createAccountSettings(db: NodePgDatabase, identity: Identity) {
  async function user() {
    const id = await identity.userId();
    if (!id) throw new AccountSettingsError(401, "Sign in to change account settings");
    return id;
  }
  return {
    async get(): Promise<AccountSettings> {
      const userId = await user();
      const [saved] = await db
        .select({ remoteControlEnabled: accountSettingsTable.remoteControlEnabled })
        .from(accountSettingsTable)
        .where(eq(accountSettingsTable.userId, userId));
      return saved ?? defaultAccountSettings;
    },
    async update(input: unknown): Promise<AccountSettings> {
      const userId = await user();
      const parsed = accountSettingsSchema.safeParse(input);
      if (!parsed.success) throw new AccountSettingsError(400, "Invalid account settings");
      const [saved] = await db
        .insert(accountSettingsTable)
        .values({ userId, ...parsed.data })
        .onConflictDoUpdate({ target: accountSettingsTable.userId, set: parsed.data })
        .returning({ remoteControlEnabled: accountSettingsTable.remoteControlEnabled });
      return saved;
    },
  };
}
