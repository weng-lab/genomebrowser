import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { BrowserView } from "./BrowserView";
import { SessionPanel } from "./SessionPanel";
import { BrowserRightPanel } from "./BrowserRightPanel";

export function BrowserPage({ sessionId }: { sessionId: string }) {
  return (
    <WorkspacePage
      title="Browser"
      subtitle={`Session ${sessionId}`}
      left={{ title: "Sessions", children: <SessionPanel /> }}
      right={{ title: "Browser tools", children: <BrowserRightPanel /> }}
    >
      <BrowserView />
    </WorkspacePage>
  );
}
