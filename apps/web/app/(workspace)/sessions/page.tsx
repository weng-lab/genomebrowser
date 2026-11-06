import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { SessionsView } from "../../../features/sessions/components/SessionsView";

export default function SessionsPage() {
  return (
    <WorkspacePage title="Sessions">
      <SessionsView />
    </WorkspacePage>
  );
}
