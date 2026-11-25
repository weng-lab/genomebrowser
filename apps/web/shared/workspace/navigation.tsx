"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import { usePanelState } from "./panels/panelState";
import type { WorkspaceNavigation } from "./types";

/** `page` when `href` is the page at `pathname`, `location` when `pathname` is inside it. */
export function routeMatch(href: string, pathname: string): "page" | "location" | undefined {
  if (href === pathname) return "page";
  if (href !== "/" && pathname.startsWith(`${href.replace(/\/$/, "")}/`)) return "location";
}

/** The workspace's navigation, for the frame's parts that follow it. */
export const NavigationContext = createContext<WorkspaceNavigation>({ sections: [] });

/**
 * The id of the left panel the current page shows: the one an entry chose, when an entry for
 * this page names it, or else the panel of the first entry for this page. The side bar marks
 * that entry and `WorkspacePage` shows that panel, so both follow the navigation's order.
 * Undefined when no entry for this page names a panel; the page then shows its first.
 */
export function useShownLeftPanel(): string | undefined {
  const navigation = useContext(NavigationContext);
  const pathname = usePathname();
  const chosen = usePanelState((state) => state.leftPanel);
  const panels = [...navigation.sections.flat(), ...(navigation.bottom ?? [])].flatMap(
    ({ href, panel }) => (panel !== undefined && routeMatch(href, pathname) ? [panel] : []),
  );
  return panels.find((panel) => panel === chosen) ?? panels[0];
}
