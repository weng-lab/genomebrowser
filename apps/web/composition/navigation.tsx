import ViewTimelineOutlined from "@mui/icons-material/ViewTimelineOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

/** Sidebar links only. Next's app directory defines routes and their content. */
export const navigation = [
  { href: "/browser", label: "Browser", icon: <ViewTimelineOutlined /> },
  { href: "/collections", label: "Collections", icon: <FolderOutlined /> },
  {
    href: "/settings",
    label: "Settings",
    icon: <SettingsOutlined />,
    placement: "bottom" as const,
  },
];
