import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { RemoteControlSetting } from "../../../features/agent/components/RemoteControlSetting";

export default function SettingsPage() {
  return (
    <WorkspacePage title="Settings">
      <RemoteControlSetting />
    </WorkspacePage>
  );
}
