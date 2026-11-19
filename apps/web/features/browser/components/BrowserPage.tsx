import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import type { ReactNode } from "react";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { SaveStatus } from "../../sessions/components/SaveStatus";
import { SessionSwitcher } from "../../sessions/components/SessionSwitcher";
import { RegionsPanel } from "../regions/components/RegionsPanel";

/**
 * The browser's frame around `children`, the browser route's page. The browser layout
 * renders it, so the session switcher and its menu stay open while the URL moves
 * between sessions, such as when the open session is deleted. The left panel is named for
 * the side bar's Browser page and holds its tools, starting with saved regions.
 */
export function BrowserPage({ children }: { children: ReactNode }) {
  return (
    <WorkspacePage
      title="Browser"
      heading={<SessionSwitcher />}
      actions={<SaveStatus />}
      left={{ title: "Genome Browser", children: <RegionsPanel /> }}
      right={{ title: "AI Assist", icon: <AutoAwesome />, children: <AgentPanel /> }}
    >
      {children}
    </WorkspacePage>
  );
}
