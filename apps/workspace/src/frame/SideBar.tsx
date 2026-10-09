import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { MouseEvent, ReactNode } from "react";
import { SIDE_BAR_WIDTH } from "./layout";
import type { WorkspacePage } from "../types";

type SideBarProps = {
  pages: readonly WorkspacePage[];
  currentPageId: string;
  getPageHref: (pageId: string) => string;
  navigate: ((href: string) => void) | undefined;
  prefetch: ((href: string) => void) | undefined;
  footer: ReactNode;
};

/** Lets the browser handle clicks that open a new tab or window, download, or use another button. */
function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.currentTarget.target
  );
}

export function SideBar({
  pages,
  currentPageId,
  getPageHref,
  navigate,
  prefetch,
  footer,
}: SideBarProps) {
  const pageLink = (page: WorkspacePage) => {
    const current = page.id === currentPageId;
    const href = getPageHref(page.id);
    return (
      <Tooltip key={page.id} title={page.label} placement="right">
        {/* A real link, so opening in a new tab and copying the address work with any router. */}
        <IconButton
          component="a"
          href={href}
          aria-label={page.label}
          aria-current={current ? "page" : undefined}
          color={current ? "primary" : "default"}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (!isPlainLeftClick(event)) return;
            if (current) {
              event.preventDefault();
            } else if (navigate) {
              event.preventDefault();
              navigate(href);
            }
          }}
          onMouseEnter={() => prefetch?.(href)}
          onFocus={() => prefetch?.(href)}
        >
          {page.icon}
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Box
      component="nav"
      aria-label="Workspace"
      sx={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        alignItems: "center",
        gap: 0.5,
        width: SIDE_BAR_WIDTH,
        p: 0.5,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      {pages.filter((page) => page.placement !== "bottom").map(pageLink)}
      <Box sx={{ flexGrow: 1 }} />
      {pages.filter((page) => page.placement === "bottom").map(pageLink)}
      {footer}
    </Box>
  );
}
