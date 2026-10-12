import type { Command } from "./command.ts";
import { setRegion } from "./setRegion.ts";

export { defineCommand, type BrowserStores, type Command } from "./command.ts";

/** Every browser command. Each one becomes an MCP tool and runs in the session's tab. */
export const commands: readonly Command[] = [setRegion];
