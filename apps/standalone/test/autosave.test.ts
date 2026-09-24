import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { restoreStores } from "@/features/session-snapshot/restoreStores";
import { createSessionAutosave } from "@/features/sessions/autosave/createAutosave";
import { parseSessionSnapshot } from "@/features/session-snapshot/parseSnapshot";
import { captureSessionSnapshot } from "@/features/session-snapshot/captureSnapshot";
import type { SaveSessionResult } from "@/features/sessions/types";

let disconnect: (() => void) | undefined;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  disconnect?.();
  disconnect = undefined;
  vi.useRealTimers();
});

function setup() {
  const { useBrowserStore, useTrackStore } = restoreStores();
  const save = vi.fn().mockResolvedValue({ ok: true, id: "session", revision: 2 });
  const queue = createSessionAutosave({
    browserStore: useBrowserStore,
    trackStore: useTrackStore,
    session: {
      id: "session",
      name: "Study",
      revision: 1,
      snapshot: parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore)),
    },
    save,
  });
  disconnect = queue.connect();
  return { useBrowserStore, useTrackStore, save, queue };
}
const region = { chromosome: "chr12", start: 1_000, end: 2_000 };

it("does not write initial hydration or transient selection mode", async () => {
  const { save, useBrowserStore, queue } = setup();
  await vi.advanceTimersByTimeAsync(350);
  useBrowserStore.getState().setSelectionMode("zoom");
  await vi.advanceTimersByTimeAsync(350);
  expect(save).not.toHaveBeenCalled();
  expect(queue.getStatus().phase).toBe("saved");
});

it("batches browser and track changes, including highlights, into the latest snapshot", async () => {
  const { save, useBrowserStore, useTrackStore } = setup();
  useBrowserStore.getState().setRegion(region);
  useBrowserStore.getState().addHighlight({ id: "highlight", region, color: "#abcdef" });
  useTrackStore.getState().updateTrack("reference-ruler", { base: { height: 35 } });
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(350);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].snapshot).toEqual(
    captureSessionSnapshot(useBrowserStore, useTrackStore),
  );
});

it("serializes writes and saves edits made during a request using its returned revision", async () => {
  const { save, useBrowserStore, useTrackStore } = setup();
  const pending = Promise.withResolvers<SaveSessionResult>();
  save
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ok: true, id: "session", revision: 3 });
  useBrowserStore.getState().setRegion(region);
  await vi.advanceTimersByTimeAsync(350);
  const nextRegion = { ...region, start: 1_100 };
  useBrowserStore.getState().setRegion(nextRegion);
  useTrackStore.getState().removeTrack("reference-annotations::gencode-v40-comprehensive");
  await vi.advanceTimersByTimeAsync(1_000);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].snapshot.browser.region).toEqual(region);
  pending.resolve({ ok: true, id: "session", revision: 2, updatedAt: "2026-09-23" });
  await vi.advanceTimersByTimeAsync(350);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0]).toMatchObject({
    revision: 2,
    snapshot: { browser: { region: nextRegion } },
  });
  expect(save.mock.calls[1][0].snapshot.trackStore.tracks).toHaveLength(1);
  expect(useBrowserStore.getState().region).toEqual(nextRegion);
});

it("does not postpone saving indefinitely while stores keep changing", async () => {
  const { save, useBrowserStore } = setup();
  for (let i = 0; i < 4; i++) {
    useBrowserStore.getState().setRegion({ ...region, start: 1_000 + i });
    await vi.advanceTimersByTimeAsync(100);
  }
  expect(save).toHaveBeenCalledTimes(1);
});

it("retries transport failures with the latest edits without changing client state", async () => {
  const { save, useBrowserStore, queue } = setup();
  save.mockRejectedValueOnce(new Error("Offline"));
  useBrowserStore.getState().setRegion(region);
  await vi.advanceTimersByTimeAsync(350);
  expect(queue.getStatus()).toMatchObject({ phase: "error" });
  const next = { ...region, start: 1_100 };
  useBrowserStore.getState().setRegion(next);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0]).toMatchObject({
    revision: 1,
    snapshot: { browser: { region: next } },
  });
  expect(queue.getStatus().phase).toBe("saved");
});

it("stops on conflicts and preserves local edits without loading the database into stores", async () => {
  const { save, useBrowserStore, queue } = setup();
  save.mockResolvedValue({ ok: false, error: "Changed in another tab. Reload before saving." });
  useBrowserStore.getState().setRegion(region);
  await vi.advanceTimersByTimeAsync(350);
  useBrowserStore.getState().setRegion({ ...region, start: 1_100 });
  await vi.advanceTimersByTimeAsync(30_000);
  expect(save).toHaveBeenCalledTimes(1);
  expect(queue.getStatus()).toMatchObject({ phase: "error" });
  expect(useBrowserStore.getState().region.start).toBe(1_100);
});

it("flushes pending changes on disconnect and drains newer edits after an in-flight write", async () => {
  const { save, useBrowserStore } = setup();
  const pending = Promise.withResolvers<SaveSessionResult>();
  save
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ok: true, id: "session", revision: 3 });
  useBrowserStore.getState().setRegion(region);
  await vi.advanceTimersByTimeAsync(350);
  const next = { ...region, start: 1_100 };
  useBrowserStore.getState().setRegion(next);
  disconnect?.();
  disconnect = undefined;
  pending.resolve({ ok: true, id: "session", revision: 2, updatedAt: "2026-09-23" });
  await vi.advanceTimersByTimeAsync(0);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0]).toMatchObject({
    revision: 2,
    snapshot: { browser: { region: next } },
  });
  useBrowserStore.getState().setRegion(region);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(save).toHaveBeenCalledTimes(2);
});

it("flushes a queued batch when leaving before its timer fires", async () => {
  const { save, useBrowserStore } = setup();
  useBrowserStore.getState().setRegion(region);
  disconnect?.();
  disconnect = undefined;
  await vi.advanceTimersByTimeAsync(0);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].snapshot.browser.region).toEqual(region);
});
