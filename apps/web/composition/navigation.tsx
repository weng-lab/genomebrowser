import ViewTimelineOutlined from "@mui/icons-material/ViewTimelineOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Box from "@mui/material/Box";
import { browserPanels } from "../features/browser/panels";
import type { WorkspaceNavigation } from "../shared/workspace/types";

/**
 * Sidebar links, in groups. Next's app directory defines routes and their content. Browser and
 * Sessions show the browser's left panels: on the browser they show or hide them, and from
 * elsewhere they go to the browser with that panel shown.
 */
export const navigation = {
  sections: [
    [
      {
        href: "/browser",
        panel: browserPanels.tools,
        label: "Browser",
        icon: <ViewTimelineOutlined />,
      },
      {
        href: "/browser",
        panel: browserPanels.sessions,
        label: "Sessions",
        icon: <ScheduleIcon />,
      },
    ],
    [{ href: "/collections", label: "Collections", icon: <FolderOutlined /> }],
  ],
  bottom: [{ href: "/settings", label: "Settings", icon: <SettingsOutlined /> }],
} satisfies WorkspaceNavigation;

/** Stands in for the app's logo at the top of the side bar until one is designed. */
export const brand = (
  <Box
    aria-hidden
    sx={{ width: 36, height: 36, my: 0.5, borderRadius: 1.5, bgcolor: "common.white" }}
  />
);
