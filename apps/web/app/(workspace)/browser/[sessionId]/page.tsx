import { notFound } from "next/navigation";
import { sessionIdSchema } from "../../../../features/sessions/schema";
import { BrowserPage } from "../../../../features/browser/components/BrowserPage";

/** The browser for one saved session. `SessionProvider` opens the session in the URL. */
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!sessionIdSchema.safeParse(sessionId).success) notFound();
  return <BrowserPage sessionId={sessionId} />;
}
