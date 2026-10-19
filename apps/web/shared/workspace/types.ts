import type { ReactNode } from "react";

export type Side = "left" | "right";
export type WorkspaceNavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  placement?: "top" | "bottom";
};
export type WorkspacePanel = { title: string; children: ReactNode };
