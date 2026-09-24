"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// MUI's component prop needs a client reference when used by a server page.
export function SiteLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} />;
}
