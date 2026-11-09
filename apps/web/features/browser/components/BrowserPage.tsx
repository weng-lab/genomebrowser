import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import type { ReactNode } from "react";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { SaveStatus } from "../../sessions/components/SaveStatus";
import { SessionSwitcher } from "../../sessions/components/SessionSwitcher";

/**
 * The browser's frame around `children`, the browser route's page. The browser layout
 * renders it, so the session switcher and its menu stay open while the URL moves
 * between sessions, such as when the open session is deleted.
 */
export function BrowserPage({ children }: { children: ReactNode }) {
  return (
    <WorkspacePage
      title="Browser"
      heading={<SessionSwitcher />}
      actions={<SaveStatus />}
      left={{ title: "Session", children: null }}
      right={{ title: "Agent", icon: <AutoAwesomeOutlined />, children: <AgentPanel /> }}
    >
      {children}
    </WorkspacePage>
  );
}
