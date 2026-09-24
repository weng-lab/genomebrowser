import { beforeEach, expect, it, vi } from "vitest";
import { createInitialSnapshot } from "@/features/session-snapshot/initialSnapshot";
import { defaultAssembly } from "@/features/assemblies/assemblies";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  save: vi.fn(),
  revalidate: vi.fn(),
  repository: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/features/auth/config", () => ({ isAuthConfigured: () => true }));
vi.mock("@/features/sessions/server/repository", () => ({
  getSessionRepository: mocks.repository,
  SessionWriteError: class extends Error {},
}));
import { PUT } from "@/app/api/sessions/[sessionId]/route";
const id = "43ae03a6-52ec-40ac-a2e2-c4c2252a177a";
const input = () => ({
  name: "Study",
  revision: 1,
  snapshot: createInitialSnapshot(defaultAssembly),
});
function request(body: unknown, headers = {}) {
  return new Request(`http://localhost/api/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const context = { params: Promise.resolve({ sessionId: id }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "owner" });
  mocks.repository.mockReturnValue({ update: mocks.save });
  mocks.save.mockResolvedValue({ id, revision: 2, updatedAt: "2026-09-23T12:00:00Z" });
});
it("writes as the authenticated owner and returns metadata without reloading the session", async () => {
  const body = input();
  const response = await PUT(request(body), context);
  expect(await response.json()).toEqual({
    ok: true,
    id,
    revision: 2,
    updatedAt: "2026-09-23T12:00:00Z",
  });
  expect(mocks.save).toHaveBeenCalledWith("owner", { ...body, id });
  expect(mocks.revalidate.mock.calls).toEqual([["/dashboard"], [`/browser/${id}`]]);
});
it("rejects unauthenticated writes and injected ownership", async () => {
  mocks.auth.mockResolvedValueOnce({ userId: null });
  expect((await PUT(request(input()), context)).status).toBe(400);
  expect((await PUT(request({ ...input(), ownerId: "someone-else" }), context)).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects cross-site writes and malformed JSON before accessing storage", async () => {
  expect((await PUT(request(input(), { "sec-fetch-site": "cross-site" }), context)).status).toBe(
    400,
  );
  expect(
    (
      await PUT(
        new Request(`http://localhost/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        context,
      )
    ).status,
  ).toBe(400);
  expect(mocks.repository).not.toHaveBeenCalled();
});
