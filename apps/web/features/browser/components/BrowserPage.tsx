import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { BrowserView } from "./BrowserView";
import { SessionName } from "../../sessions/components/SessionName";
import { SessionPanel } from "../../sessions/components/SessionPanel";

/** `sessionId` is the session in the URL, which may still be opening. */
export function BrowserPage({ sessionId }: { sessionId?: string }) {
  return (
    <WorkspacePage
      title="Browser"
      subtitle={<SessionName />}
      left={{ title: "Sessions", children: <SessionPanel /> }}
      right={{ title: "Agent", children: <AgentPanel /> }}
    >
      <BrowserView sessionId={sessionId} />
    </WorkspacePage>
  );
}
