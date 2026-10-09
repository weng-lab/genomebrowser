import type { ComponentType, ReactNode } from "react";

export type Side = "left" | "right";

/** The center panel: the page's main content and an optional breadcrumb title. */
export type CenterPanel = {
  /** Rendered in the breadcrumbs after the page label. A component so it can show live state. */
  title?: ComponentType;
  content: ComponentType;
};

/** A side panel: the title shown in its title row and the content below it. */
export type SidePanel = {
  title: string;
  content: ComponentType;
};

/**
 * A page the workspace can show. A page supplies only content; the workspace frame places
 * each panel, sizes it, and shows a panel's collapse toggle only when the page has that panel.
 */
export type WorkspacePage = {
  /** Also the page's route segment, so keep it stable, unique, and URL-safe. */
  id: string;
  /** Names the page in the side bar and starts the breadcrumbs. */
  label: string;
  /** The page's side bar icon. */
  icon: ReactNode;
  /** Side bar group. Defaults to the top group. */
  placement?: "top" | "bottom";
  panels: {
    center: CenterPanel;
    left?: SidePanel;
    right?: SidePanel;
  };
};

/** The pages a workspace shows, in side bar order. The first opens for an unknown page ID. */
export type WorkspacePages = readonly [WorkspacePage, ...WorkspacePage[]];
