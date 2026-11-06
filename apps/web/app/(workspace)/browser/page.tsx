"use client";

import { redirect } from "next/navigation";
import { useSession } from "../../../features/sessions/SessionProvider";
import { BrowserView } from "../../../features/browser/components/BrowserView";

/** Return to the open session, so the sidebar link does not close it. */
export default function BrowserIndexPage() {
  const id = useSession((session) => session.active?.id);
  if (id) redirect(`/browser/${id}`);
  return <BrowserView />;
}
