"use client";

import { redirect } from "next/navigation";
import { useSessionId } from "../../../browser/BrowserServer";

/** Return to the session viewed last, so the sidebar link does not switch sessions. */
export default function BrowserIndexPage() {
  redirect(`/browser/${useSessionId()}`);
}
