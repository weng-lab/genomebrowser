import type { BrowserCommand, RegionResult } from "@weng-lab/browser-server/protocol";
import type { BrowserSession } from "./BrowserSession";

/** Execute validated commands against the same stores used by the application UI. */
export function executeBrowserCommand(
  session: BrowserSession,
  command: BrowserCommand,
): RegionResult {
  switch (command.type) {
    case "region.set":
      return session.useBrowserStore.getState().setRegion(command.region);
  }
}
