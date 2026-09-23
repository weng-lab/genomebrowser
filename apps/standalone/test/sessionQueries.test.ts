import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentUserSession } from "../features/sessions/queries";

const mocks = vi.hoisted(() => ({
  getByOwner: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "owner-a" }),
}));
vi.mock("../features/auth/config", () => ({ isAuthConfigured: () => true }));
vi.mock("../features/sessions/repository", () => ({
  getSessionRepository: () => ({ getByOwner: mocks.getByOwner }),
}));

const id = "43ae03a6-52ec-40ac-a2e2-c4c2252a177a";

beforeEach(() => {
  mocks.getByOwner.mockReset();
});

it("redirects a missing remembered session to the unsaved browser", async () => {
  mocks.getByOwner.mockResolvedValue(null);
  await expect(getCurrentUserSession(id)).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;/browser;307;",
  });
  expect(mocks.getByOwner).toHaveBeenCalledWith("owner-a", id);
});

it("preserves database failures as load errors instead of opening an unsaved browser", async () => {
  const error = new Error("Database unavailable");
  mocks.getByOwner.mockRejectedValue(error);
  await expect(getCurrentUserSession(id)).rejects.toBe(error);
});
