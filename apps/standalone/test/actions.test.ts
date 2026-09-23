import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSnapshot } from "../features/sessions/initialSnapshot";
import { defaultAssembly } from "../features/browser/assembly";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  configured: vi.fn(),
  repository: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../features/auth/config", () => ({ isAuthConfigured: mocks.configured }));
vi.mock("../features/sessions/repository", () => ({
  getSessionRepository: mocks.repository,
  SessionWriteError: class extends Error {},
}));
import { createSession, deleteSession } from "../features/sessions/actions";

import { saveSession } from "../features/sessions/saveSession";

describe("session action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ userId: "authenticated-owner" });
    mocks.repository.mockReturnValue({ save: mocks.save, deleteByOwner: mocks.remove });
    mocks.save.mockResolvedValue({
      id: "43ae03a6-52ec-40ac-a2e2-c4c2252a177a",
      revision: 1,
      updatedAt: new Date().toISOString(),
    });
  });
  it("does not access storage for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await createSession({ name: "Test", assemblyId: "hg38" })).ok).toBe(false);
    expect((await saveSession({})).ok).toBe(false);
    expect((await deleteSession("43ae03a6-52ec-40ac-a2e2-c4c2252a177a")).ok).toBe(false);
    expect(mocks.repository).not.toHaveBeenCalled();
  });
  it("creates with the authenticated owner and assembly registry defaults", async () => {
    expect((await createSession({ name: "  My session  ", assemblyId: "mm10" })).ok).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(
      "authenticated-owner",
      expect.objectContaining({
        name: "My session",
        snapshot: expect.objectContaining({
          browser: expect.objectContaining({ assembly: expect.objectContaining({ id: "mm10" }) }),
        }),
      }),
    );
  });
  it("rejects client-supplied ownership and unknown assemblies", async () => {
    expect(
      (await createSession({ name: "Test", assemblyId: "hg38", ownerId: "another-user" })).ok,
    ).toBe(false);
    expect((await createSession({ name: "Test", assemblyId: "unknown" })).ok).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("passes the authenticated owner and expected revision to updates", async () => {
    const input = {
      id: "43ae03a6-52ec-40ac-a2e2-c4c2252a177a",
      revision: 3,
      name: "Updated",
      snapshot: createInitialSnapshot(defaultAssembly),
    };
    expect((await saveSession(input)).ok).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith("authenticated-owner", input);
    expect((await saveSession({ ...input, ownerId: "another-user" })).ok).toBe(false);
  });
});
