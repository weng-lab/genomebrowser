"use client";

import { redirect } from "next/navigation";
import { useSession } from "../../../sessions/SessionProvider";
import { BrowserPage } from "./BrowserPage";

/** Return to the open session, so the sidebar link does not close it. */
export default function BrowserIndexPage() {
  const id = useSession((session) => session.active?.id);
  if (id) redirect(`/browser/${id}`);
  return <BrowserPage />;
}
