import { beforeEach, describe, expect, it, vi } from "vitest";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { assemblies, defaultAssembly } from "@/features/assemblies/assemblies";
import { createCustomTrackDraft } from "@/features/custom-tracks/catalog";
import { parseCustomTrack } from "@/features/custom-tracks/server/validation";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  configured: vi.fn(),
  repository: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/config", () => ({ isAuthConfigured: mocks.configured }));
vi.mock("@/features/custom-tracks/server/repository", () => ({
  getCustomTrackRepository: mocks.repository,
}));
import { saveCustomTrack } from "@/features/custom-tracks/actions";

function input() {
  const track = createCustomTrackDraft(firstPartyTrackModules[0], defaultAssembly);
  return JSON.parse(JSON.stringify({ assemblyId: "hg38", track }));
}

describe("custom track creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ userId: "owner" });
    mocks.repository.mockReturnValue({ save: mocks.save });
    mocks.save.mockImplementation((_owner, entry) => Promise.resolve(entry));
  });

  it("provides valid editable defaults for every module and assembly", () => {
    for (const assembly of assemblies)
      for (const module of firstPartyTrackModules) {
        const draft = createCustomTrackDraft(module, assembly);
        expect(module.validate(draft).source).toBe("user");
      }
  });

  it("rejects placeholder sources, unknown assemblies, and host ownership", () => {
    const bigwig = createCustomTrackDraft(firstPartyTrackModules[2], defaultAssembly);
    expect(() => parseCustomTrack({ assemblyId: "hg38", track: bigwig })).toThrow(/URL/);
    expect(() => parseCustomTrack({ ...input(), assemblyId: "unknown" })).toThrow(/assembly/);
    const host = input();
    host.track.source = "host";
    expect(() => parseCustomTrack(host)).toThrow(/user-owned/);
  });

  it("derives ownership on the server and returns the saved configuration", async () => {
    const entry = input();
    expect(await saveCustomTrack(entry)).toEqual({ ok: true, entry });
    expect(mocks.save).toHaveBeenCalledWith("owner", entry);
    expect((await saveCustomTrack({ ...entry, ownerId: "other" })).ok).toBe(false);
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated requests without accessing storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await saveCustomTrack(input())).ok).toBe(false);
    expect(mocks.repository).not.toHaveBeenCalled();
  });

  it("reports storage failures without claiming success", async () => {
    mocks.save.mockRejectedValue(new Error("database failed"));
    expect(await saveCustomTrack(input())).toMatchObject({ ok: false });
  });
});
