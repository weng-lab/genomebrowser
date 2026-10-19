import { notFound } from "next/navigation";
import { sessionIdSchema } from "../../../../sessions/schema";
import { BrowserPage } from "../BrowserPage";

/** The browser for one saved session. `SessionProvider` opens the session in the URL. */
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!sessionIdSchema.safeParse(sessionId).success) notFound();
  return <BrowserPage sessionId={sessionId} />;
}
