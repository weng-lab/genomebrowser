import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { AgentPanel } from "./AgentPanel";
import { BrowserView } from "./BrowserView";
import { SessionName } from "./SessionName";
import { SessionPanel } from "./SessionPanel";

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
