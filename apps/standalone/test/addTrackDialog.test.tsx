// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AddTrackDialog } from "@/features/custom-tracks/AddTrackDialog";
import { restoreStores } from "@/features/session-snapshot/restoreStores";
import { defaultAssembly } from "@/features/assemblies/assemblies";
import { DashboardTabs } from "@/app/dashboard/_components/DashboardTabs";
import { CustomTrackList } from "@/features/custom-tracks/CustomTrackList";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/features/custom-tracks/actions", () => ({ saveCustomTrack: mocks.save }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
function button(text: string) {
  const found = [...document.querySelectorAll("button")].find(
    (node) => node.textContent === text || node.getAttribute("aria-label") === text,
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
async function change(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function openBigwig() {
  const stores = restoreStores();
  const close = vi.fn();
  await act(async () =>
    root.render(
      <AddTrackDialog
        assembly={defaultAssembly}
        useTrackStore={stores.useTrackStore}
        onClose={close}
      />,
    ),
  );
  expect(document.querySelectorAll("li button")).toHaveLength(8);
  await act(async () => button("Add BigWig").click());
  return { ...stores, close };
}
async function setUrl() {
  // Existing repository URL, used only as draft data in this test.
  await change(
    document.querySelector<HTMLInputElement>('input[type="url"]')!,
    "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  );
  await act(async () => button("Set URL").click());
}

it("saves before inserting below pinned tracks and disables repeated submission", async () => {
  const { useTrackStore, close } = await openBigwig();
  const initial = useTrackStore.getState().tracks;
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof mocks.save>>>();
  mocks.save.mockReturnValue(pending.promise);
  await setUrl();
  await act(async () => button("Add track").click());
  expect(useTrackStore.getState().tracks).toEqual(initial);
  expect(button("Adding…").disabled).toBe(true);
  expect(close).not.toHaveBeenCalled();
  const entry = mocks.save.mock.calls[0][0];
  await act(async () => pending.resolve({ ok: true, entry }));
  const state = useTrackStore.getState();
  const pinnedCount = initial.filter((track) =>
    state.pinnedTrackIds.includes(track.base.id),
  ).length;
  expect(pinnedCount).toBe(2);
  expect(state.tracks[pinnedCount]).toEqual(entry.track);
  expect(state.tracks[pinnedCount].source).toBe("user");
  expect(state.tracks.filter((track) => track.base.id !== entry.track.base.id)).toEqual(initial);
  expect(close).toHaveBeenCalledOnce();
});

it("preserves a failed draft, and cancel never changes browser tracks", async () => {
  const { useTrackStore, close } = await openBigwig();
  const initial = useTrackStore.getState().tracks;
  mocks.save.mockResolvedValue({ ok: false, error: "Storage unavailable" });
  await setUrl();
  await act(async () => button("Add track").click());
  expect(document.body.textContent).toContain("Storage unavailable");
  expect(document.querySelector<HTMLInputElement>('input[type="url"]')!.value).toContain(
    "downloads.wenglab.org",
  );
  expect(close).not.toHaveBeenCalled();
  await act(async () => button("Cancel").click());
  expect(close).toHaveBeenCalledOnce();
  expect(useTrackStore.getState().tracks).toEqual(initial);
});

it("does not save a placeholder or uncommitted source", async () => {
  await openBigwig();
  await act(async () => button("Add track").click());
  expect(mocks.save).not.toHaveBeenCalled();
  await change(
    document.querySelector<HTMLInputElement>('input[type="url"]')!,
    "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  );
  await act(async () => button("Add track").click());
  expect(mocks.save).not.toHaveBeenCalled();
});

it("separates sessions and persisted custom collections in horizontal tabs", async () => {
  const { useTrackStore } = restoreStores();
  const track = JSON.parse(JSON.stringify(useTrackStore.getState().tracks[0]));
  await act(async () =>
    root.render(
      <DashboardTabs
        sessions={<div>Session list</div>}
        collections={
          <CustomTrackList result={{ status: "ready", tracks: [{ assemblyId: "hg38", track }] }} />
        }
      />,
    ),
  );
  expect(container.textContent).toContain("Session list");
  await act(async () => button("Custom tracks / collections").click());
  expect(container.textContent).not.toContain("Session list");
  expect(container.textContent).toContain("Custom tracks · hg38");
  expect(container.textContent).toContain(track.base.title);
});

it("reuses saved tracks only in their assembly and leaves the collection copy unchanged", async () => {
  const { useTrackStore } = restoreStores();
  const saved = JSON.parse(JSON.stringify(useTrackStore.getState().tracks[1]));
  saved.base.id = crypto.randomUUID();
  saved.source = "user";
  saved.base.title = "Saved annotation";
  const other = { ...saved, base: { ...saved.base, id: crypto.randomUUID(), title: "Mouse only" } };
  const close = vi.fn();
  await act(async () =>
    root.render(
      <AddTrackDialog
        assembly={defaultAssembly}
        useTrackStore={useTrackStore}
        customTracks={{
          status: "ready",
          tracks: [
            { assemblyId: "hg38", track: saved },
            { assemblyId: "mm10", track: other },
          ],
        }}
        onClose={close}
      />,
    ),
  );
  await act(async () => button("Saved custom tracks").click());
  expect(document.body.textContent).toContain("Saved annotation");
  expect(document.body.textContent).not.toContain("Mouse only");
  await act(async () => button("Add to browser").click());
  expect(useTrackStore.getState().getTrack(saved.base.id)?.source).toBe("user");
  await act(async () => {
    useTrackStore.getState().updateTrack(saved.base.id, { base: { title: "Session edit" } });
  });
  expect(saved.base.title).toBe("Saved annotation");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
});
