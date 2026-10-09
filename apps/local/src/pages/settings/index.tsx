import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import type { WorkspacePage } from "@weng-lab/workspace";
import { SettingsView } from "./SettingsView";

export const settingsPage: WorkspacePage = {
  id: "settings",
  label: "Settings",
  icon: <SettingsOutlined />,
  placement: "bottom",
  panels: {
    center: { content: SettingsView },
  },
};
