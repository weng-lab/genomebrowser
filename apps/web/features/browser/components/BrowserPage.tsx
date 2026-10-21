import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { BrowserView } from "./BrowserView";
import { SessionName } from "../../sessions/components/SessionName";
import { SessionRegionsPanel } from "../../sessions/components/SessionRegionsPanel";

/** `sessionId` is the session in the URL, which may still be opening. */
export function BrowserPage({ sessionId }: { sessionId?: string }) {
  return (
    <WorkspacePage
      title="Browser"
      subtitle={<SessionName />}
      left={{ title: "Sessions", children: <SessionRegionsPanel /> }}
      right={{ title: "Agent", children: <AgentPanel /> }}
    >
      <BrowserView sessionId={sessionId} />
    </WorkspacePage>
  );
}
