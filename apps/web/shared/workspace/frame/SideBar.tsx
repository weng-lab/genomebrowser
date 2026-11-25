import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { NavRail, type NavRailItem } from "../../ui/NavRail";
import { routeMatch, useShownLeftPanel } from "../navigation";
import { usePanelState } from "../panels/panelState";
import type { WorkspaceNavigation, WorkspaceNavigationItem } from "../types";

type SideBarProps = {
  navigation: WorkspaceNavigation;
  brand?: ReactNode;
  footer?: ReactNode;
};

/**
 * The workspace's navigation rail: Next.js links, with the current route's entry selected.
 * On its page, an entry with a panel is a button that shows or hides that left panel.
 */
export function SideBar({ navigation, brand, footer }: SideBarProps) {
  const pathname = usePathname();
  const leftOpen = usePanelState((state) => state.leftOpen);
  const toggle = usePanelState((state) => state.toggle);
  const showLeft = usePanelState((state) => state.showLeft);
  const shownPanel = useShownLeftPanel();

  const toItem = ({ href, label, icon, panel }: WorkspaceNavigationItem): NavRailItem => {
    const current = routeMatch(href, pathname);
    if (panel === undefined) return { href, label, icon, current };
    if (current === undefined)
      return {
        href,
        label,
        icon,
        // The page opens with the panel shown, unless the link opens elsewhere, such as a new tab.
        onClick: (event: MouseEvent) => {
          if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) showLeft(panel);
        },
      };
    const shown = leftOpen && shownPanel === panel;
    return {
      label,
      icon,
      expanded: shown,
      controls: "left-panel",
      onClick: () => (shown ? toggle("left") : showLeft(panel)),
    };
  };
  return (
    <NavRail
      aria-label="Workspace"
      brand={brand}
      sections={navigation.sections.map((items) => items.map(toItem))}
      bottom={navigation.bottom?.map(toItem)}
      footer={footer}
      linkComponent={Link}
    />
  );
}
