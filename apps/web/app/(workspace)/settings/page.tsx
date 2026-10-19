import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { SettingsView } from "../../../features/settings/components/SettingsView";

export default function SettingsPage() {
  return (
    <WorkspacePage title="Settings">
      <SettingsView />
    </WorkspacePage>
  );
}
