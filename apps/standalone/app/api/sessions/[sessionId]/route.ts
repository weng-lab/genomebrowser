import { revalidatePath } from "next/cache";
import { saveSession } from "../../../../features/sessions/saveSession";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    request.headers.get("content-type")?.split(";")[0].trim() !== "application/json"
  ) {
    return Response.json({ ok: false, error: "Invalid session request." }, { status: 400 });
  }
  let input;
  try {
    input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return Response.json({ ok: false, error: "Invalid session request." }, { status: 400 });
  }
  const { sessionId } = await params;
  const result = await saveSession({ ...input, id: sessionId });
  if (result.ok) {
    // Route-handler invalidation affects future visits, without refreshing the active page.
    revalidatePath("/dashboard");
    revalidatePath(`/browser/${sessionId}`);
  }
  return Response.json(result, { status: result.ok ? 200 : result.retryable ? 503 : 400 });
}
