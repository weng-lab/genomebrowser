import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { BrowserView } from "./BrowserView";
import { SessionPanel } from "./SessionPanel";
import { AgentPanel } from "./AgentPanel";

export function BrowserPage({ sessionId }: { sessionId: string }) {
  return (
    <WorkspacePage
      title="Browser"
      subtitle={`Session ${sessionId}`}
      left={{ title: "Sessions", children: <SessionPanel /> }}
      right={{ title: "Agent", children: <AgentPanel /> }}
    >
      <BrowserView />
    </WorkspacePage>
  );
}
