"use client";

import { redirect } from "next/navigation";
import { useSession } from "../../../features/sessions/SessionProvider";
import { BrowserPage } from "../../../features/browser/components/BrowserPage";

/** Return to the open session, so the sidebar link does not close it. */
export default function BrowserIndexPage() {
  const id = useSession((session) => session.active?.id);
  if (id) redirect(`/browser/${id}`);
  return <BrowserPage />;
}
