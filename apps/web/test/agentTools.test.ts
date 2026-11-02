import { readdir } from "node:fs/promises";
import { expect, it } from "vitest";
import { commands } from "../features/agent/commands";

// Eve names each tool after its file, so a command without one is invisible to agents.
it("gives every command an agent tool file", async () => {
  const files = await readdir(new URL("../agent/tools", import.meta.url));
  const tools = files.map((file) => file.replace(/\.ts$/, ""));
  for (const { name } of commands) expect(tools).toContain(name);
});
