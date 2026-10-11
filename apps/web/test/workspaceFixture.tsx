import type { ReactNode } from "react";
import { vi } from "vitest";
const route = vi.hoisted(() => ({ pathname: "/home" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}));
export function setTestPathname(pathname: string) {
  route.pathname = pathname;
}
