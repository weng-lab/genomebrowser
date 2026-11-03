import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { BrowserView } from "./BrowserView";
import { SaveStatus } from "../../sessions/components/SaveStatus";
import { SessionSwitcher } from "../../sessions/components/SessionSwitcher";

/** `sessionId` is the session in the URL, which may still be opening. */
export function BrowserPage({ sessionId }: { sessionId?: string }) {
  return (
    <WorkspacePage
      title="Browser"
      heading={<SessionSwitcher />}
      actions={<SaveStatus />}
      right={{ title: "Agent", icon: <AutoAwesomeOutlined />, children: <AgentPanel /> }}
    >
      <BrowserView sessionId={sessionId} />
    </WorkspacePage>
  );
}
