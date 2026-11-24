import type { ReactNode } from "react";

export type Side = "left" | "right";
export type WorkspaceNavigationItem = {
  href: string;
  /** Names the entry, so it must be unique within the side bar. */
  label: string;
  icon: ReactNode;
  /**
   * The id of a left panel that the page at `href` supplies. On that page, the entry shows the
   * panel, or hides it while it is shown; elsewhere it goes there with the panel shown. Until an
   * entry chooses one, the page shows its first left panel, so list that panel's entry first.
   */
  panel?: string;
};
/** The side bar's links: groups from the top, separated by lines, then links at the bottom. */
export type WorkspaceNavigation = {
  sections: readonly (readonly WorkspaceNavigationItem[])[];
  bottom?: readonly WorkspaceNavigationItem[];
};
export type WorkspacePanel = {
  /** Which of a page's left panels this is, for navigation entries that show it. */
  id?: string;
  title: string;
  /** Shown beside the title in the panel's title row and on the right panel's button. */
  icon?: ReactNode;
  children: ReactNode;
};
