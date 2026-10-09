import ViewTimelineOutlined from "@mui/icons-material/ViewTimelineOutlined";
import { AgentPanel } from "./AgentPanel";
import type { WorkspacePage } from "@weng-lab/workspace";
import { BrowserView } from "./BrowserView";
import { SessionPanel } from "./SessionPanel";

export const browserPage: WorkspacePage = {
  id: "browser",
  label: "Browser",
  icon: <ViewTimelineOutlined />,
  panels: {
    left: { title: "Sessions", content: SessionPanel },
    center: { title: () => "Untitled session", content: BrowserView },
    right: { title: "Agent", content: AgentPanel },
  },
};
