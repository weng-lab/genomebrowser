import "server-only";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import {
  AccountSettingsError,
  accountSettingsSchema,
  agentPreferencesSchema,
  defaultAccountSettings,
  type AccountSettings,
  type AgentPreferences,
} from "../settings";
import type { Identity } from "./identity";
import { accountSettingsTable } from "./table";

/** The acting user's settings. Every operation resolves the user from the injected identity. */
export type AccountSettingsStore = {
  get(): Promise<AccountSettings>;
  /** Replace the settings with `input`, validated, and return what was saved. */
  update(input: unknown): Promise<AccountSettings>;
  agentPreferences(): Promise<AgentPreferences>;
  /** Replace the agent preferences with `input`, validated, and return what was saved. */
  updateAgentPreferences(input: unknown): Promise<AgentPreferences>;
};

export function createAccountSettings({
  db,
  identity,
}: {
  db: NodePgDatabase;
  identity: Identity;
}): AccountSettingsStore {
  async function actingUser() {
    const userId = await identity.userId();
    if (!userId) throw new AccountSettingsError("UNAUTHENTICATED", "Sign in to save settings");
    return userId;
  }
  const saved = { remoteControl: accountSettingsTable.remoteControl };

  return {
    async get() {
      const userId = await actingUser();
      const [settings] = await db
        .select(saved)
        .from(accountSettingsTable)
        .where(eq(accountSettingsTable.userId, userId));
      return settings ?? defaultAccountSettings;
    },

    async update(input) {
      const userId = await actingUser();
      const parsed = accountSettingsSchema.safeParse(input);
      if (!parsed.success)
        throw new AccountSettingsError("INVALID_INPUT", z.prettifyError(parsed.error));
      const [settings] = await db
        .insert(accountSettingsTable)
        .values({ userId, ...parsed.data })
        .onConflictDoUpdate({ target: accountSettingsTable.userId, set: parsed.data })
        .returning(saved);
      return settings;
    },

    async agentPreferences() {
      const userId = await actingUser();
      const [row] = await db
        .select({ text: accountSettingsTable.agentPreferences })
        .from(accountSettingsTable)
        .where(eq(accountSettingsTable.userId, userId));
      return { text: row?.text ?? "" };
    },

    async updateAgentPreferences(input) {
      const userId = await actingUser();
      const parsed = agentPreferencesSchema.safeParse(input);
      if (!parsed.success)
        throw new AccountSettingsError("INVALID_INPUT", z.prettifyError(parsed.error));
      const agentPreferences = parsed.data.text.trim();
      await db
        .insert(accountSettingsTable)
        .values({ userId, agentPreferences })
        .onConflictDoUpdate({ target: accountSettingsTable.userId, set: { agentPreferences } });
      return { text: agentPreferences };
    },
  };
}
