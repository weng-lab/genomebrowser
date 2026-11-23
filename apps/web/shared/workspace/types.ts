import type { ReactNode } from "react";

export type Side = "left" | "right";
export type WorkspaceNavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
};
/** The side bar's links: groups from the top, separated by lines, then links at the bottom. */
export type WorkspaceNavigation = {
  sections: readonly (readonly WorkspaceNavigationItem[])[];
  bottom?: readonly WorkspaceNavigationItem[];
};
export type WorkspacePanel = {
  title: string;
  /** Shown beside the title in the panel's title row and on the right panel's button. */
  icon?: ReactNode;
  children: ReactNode;
};
