import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { BrowserView } from "./BrowserView";
import { SessionSwitcher } from "../../sessions/components/SessionSwitcher";

/** `sessionId` is the session in the URL, which may still be opening. */
export function BrowserPage({ sessionId }: { sessionId?: string }) {
  return (
    <WorkspacePage
      title="Browser"
      heading={<SessionSwitcher />}
      right={{ title: "Agent", children: <AgentPanel /> }}
    >
      <BrowserView sessionId={sessionId} />
    </WorkspacePage>
  );
}
