import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavRail, type NavRailItem } from "../../ui/NavRail";
import type { WorkspaceNavigationItem } from "../types";

type SideBarProps = {
  navigation: readonly WorkspaceNavigationItem[];
  brand?: ReactNode;
  footer?: ReactNode;
};

/** The workspace's navigation rail: Next.js links, with the current route's entry selected. */
export function SideBar({ navigation, brand, footer }: SideBarProps) {
  const pathname = usePathname();
  const toItem = ({ href, label, icon }: WorkspaceNavigationItem): NavRailItem => {
    const exact = href === pathname;
    const inside = href !== "/" && pathname.startsWith(`${href.replace(/\/$/, "")}/`);
    return { href, label, icon, current: exact ? "page" : inside ? "location" : undefined };
  };
  // Groups keep the order of their first entry.
  const groups = Map.groupBy(
    navigation.filter((item) => item.placement !== "bottom"),
    (item) => item.group,
  );
  return (
    <NavRail
      aria-label="Workspace"
      brand={brand}
      sections={[...groups.values()].map((items) => items.map(toItem))}
      bottom={navigation.filter((item) => item.placement === "bottom").map(toItem)}
      footer={footer}
      linkComponent={Link}
    />
  );
}
