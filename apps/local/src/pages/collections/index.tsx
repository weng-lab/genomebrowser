import CollectionsBookmarkOutlined from "@mui/icons-material/CollectionsBookmarkOutlined";
import type { WorkspacePage } from "@weng-lab/workspace";
import { CollectionsView } from "./CollectionsView";

export const collectionsPage: WorkspacePage = {
  id: "collections",
  label: "Collections",
  icon: <CollectionsBookmarkOutlined />,
  panels: {
    center: { content: CollectionsView },
  },
};
