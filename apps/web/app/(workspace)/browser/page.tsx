import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { BrowserView } from "./BrowserView";
import { SessionPanel } from "./SessionPanel";
import { AgentPanel } from "./AgentPanel";

export default function BrowserPage() {
  return (
    <WorkspacePage
      title="Browser"
      subtitle="Untitled session"
      left={{ title: "Sessions", children: <SessionPanel /> }}
      right={{ title: "Agent", children: <AgentPanel /> }}
    >
      <BrowserView />
    </WorkspacePage>
  );
}
