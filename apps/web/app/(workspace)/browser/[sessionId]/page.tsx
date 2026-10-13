import { notFound } from "next/navigation";
import { sessionIdSchema } from "@weng-lab/browser-server/protocol";
import { BrowserPage } from "../BrowserPage";

/** The browser for one session. `AppProviders` reads the same `sessionId` from the URL. */
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!sessionIdSchema.safeParse(sessionId).success) notFound();
  return <BrowserPage sessionId={sessionId} />;
}
