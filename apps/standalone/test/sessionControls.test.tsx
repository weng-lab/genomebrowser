// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createBrowserStores } from "../features/browser/stores";
import { SessionAutosave } from "../features/sessions/SessionAutosave";
import { CreateSessionButton } from "../features/sessions/CreateSessionButton";
import type { SaveSessionResult } from "../features/sessions/types";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));
vi.mock("../features/sessions/actions", () => ({ createSession: mocks.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../features/site/SiteLink", () => ({ SiteLink: "a" }));

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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function button(text: string) {
  const result = [...document.querySelectorAll("button")].find(
    (element) => element.textContent === text,
  );
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}

it("autosaves without save or name controls and keeps newer edits local", async () => {
  vi.useFakeTimers();
  const { useBrowserStore, useTrackStore } = createBrowserStores();
  const first = Promise.withResolvers<Response>();
  const fetch = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(
      Response.json({ ok: true, id: "session", revision: 3, updatedAt: "2026-09-23T12:00:00Z" }),
    );
  vi.stubGlobal("fetch", fetch);
  await act(async () =>
    root.render(
      <StrictMode>
        <SessionAutosave
          browserStore={useBrowserStore}
          trackStore={useTrackStore}
          initialSession={{ id: "session", name: "Study", revision: 1 }}
        />
      </StrictMode>,
    ),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(container.querySelector("input")).toBeNull();
  expect(container.textContent).not.toContain("Save session");
  const firstRegion = { chromosome: "chr12", start: 53_373_000, end: 53_374_000 };
  await act(async () => {
    useBrowserStore.getState().setRegion(firstRegion);
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(container.innerHTML).toBe("");
  const nextRegion = { ...firstRegion, end: 53_375_000 };
  await act(async () => {
    useBrowserStore.getState().setRegion(nextRegion);
  });
  expect(useBrowserStore.getState().region).toEqual(nextRegion);
  expect(JSON.parse(fetch.mock.calls[0][1].body).snapshot.browser.region).toEqual(firstRegion);
  await act(async () => {
    first.resolve(Response.json({ ok: true, id: "session", revision: 2 }));
    await vi.advanceTimersByTimeAsync(700);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    revision: 2,
    snapshot: { browser: { region: nextRegion } },
  });
  expect(useBrowserStore.getState().region).toEqual(nextRegion);
  expect(container.innerHTML).toBe("");
});

it("creates from the assembly picker and navigates only after the database save succeeds", async () => {
  const creation = Promise.withResolvers<SaveSessionResult>();
  mocks.create.mockReturnValue(creation.promise);
  await act(async () =>
    root.render(
      <CreateSessionButton assemblies={[{ id: "mm10", label: "Mouse" }]} disabled={false} />,
    ),
  );
  await act(async () => button("Create a session").click());
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(mocks.create).toHaveBeenCalledWith({ name: "Untitled session", assemblyId: "mm10" });
  expect(mocks.push).not.toHaveBeenCalled();
  expect(button("Creating…").disabled).toBe(true);
  await act(async () =>
    creation.resolve({
      ok: true,
      id: "created-session",
      revision: 1,
      updatedAt: "2026-09-23T12:00:00Z",
    }),
  );
  expect(mocks.push).toHaveBeenCalledWith("/browser/created-session");
});

it("keeps the creation form open on failure", async () => {
  mocks.create.mockResolvedValue({ ok: false, error: "Storage unavailable" });
  await act(async () =>
    root.render(
      <CreateSessionButton assemblies={[{ id: "hg38", label: "Human" }]} disabled={false} />,
    ),
  );
  await act(async () => button("Create a session").click());
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(document.body.textContent).toContain("Storage unavailable");
  expect(
    document.querySelector<HTMLInputElement>('input[value="Untitled session"]'),
  ).not.toBeNull();
  expect(mocks.push).not.toHaveBeenCalled();
});
