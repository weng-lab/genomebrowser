// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let server: SessionServer;
let id: string;

beforeEach(() => {
  server = installSessionServer();
  server.remoteControl.set("user_alice", false);
  id = server.add("Session", snapshot(createStores("hg38")!));
  route.reset(`/browser/${id}`);
  stubLayout();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fixture(path: string) {
  return new Uint8Array(
    readFileSync(join(import.meta.dirname, "../../../packages/reader/test/fixtures", path)),
  );
}
const bigWig = fixture("bigwig/basic.bw");
const bed6 = fixture("bigbed/basic.bb");
const host = "https://data.example.test";
const startingTitles = ["Coordinates", "GENCODE 50 basic", "Human cCREs"];

const savedTracks = () => server.stored.get(id)!.snapshot.tracks;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const button = (label: string) =>
  [...document.querySelectorAll("button")].find((element) => element.textContent === label);
const rows = () => [...dialog()!.querySelectorAll('[aria-label="Tracks to add"] > li')];
// MUI's multiline field also renders a hidden copy for measuring.
const pasteBox = () => dialog()!.querySelector<HTMLTextAreaElement>("textarea:not([aria-hidden])")!;

async function click(element: Element | undefined) {
  await act(async () => (element as HTMLElement).click());
}

async function enter(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")!.set!.call(
      element,
      value,
    );
    const event = element instanceof HTMLSelectElement ? "change" : "input";
    element.dispatchEvent(new Event(event, { bubbles: true }));
  });
}

/** The control a row labels `label`. */
function field(row: Element, label: string) {
  const labelElement = [...row.querySelectorAll("label")].find(
    (element) => element.textContent === label,
  );
  return row.querySelector<HTMLInputElement & HTMLSelectElement>(
    `[id="${labelElement!.htmlFor}"]`,
  )!;
}

async function openDialog() {
  await act(async () => root!.render(<WorkspaceApp />));
  const open = await vi.waitFor(() => {
    const element = button("Add tracks");
    expect(element).toBeDefined();
    return element;
  });
  await click(open);
}

it("adds pasted URLs and track lines after review, showing each failure on its row", async () => {
  server.files.set(`${host}/signal.bw`, bigWig);
  server.files.set(`${host}/peaks.bb`, bed6);
  server.files.set(`${host}/missing.bw`, 404);
  server.files.set(`${host}/gone.bw`, 404);
  server.files.set(`${host}/found.bw`, bigWig);
  await openDialog();
  const lines = [
    `${host}/signal.bw`,
    `track type=bigBed 6 name="Peaks" bigDataUrl=${host}/peaks.bb color=0,128,0 description="Called peaks" priority=1`,
    `${host}/missing.bw`,
    `${host}/gone.bw`,
  ];

  // A line that can't become a track stops the review, and the text stays to fix.
  await enter(pasteBox(), [...lines, "chr1 100 200 peak"].join("\n"));
  await click(button("Review"));
  expect(dialog()!.querySelector('[aria-label="Lines that can\'t be added"]')?.textContent).toMatch(
    /^Line 5: /,
  );
  await enter(pasteBox(), lines.join("\n"));
  await click(button("Review"));

  // Priority puts the track line first; its settings fill the row.
  expect(rows().map((row) => field(row, "URL").value)).toEqual([
    `${host}/peaks.bb`,
    `${host}/signal.bw`,
    `${host}/missing.bw`,
    `${host}/gone.bw`,
  ]);
  const [peaks, signal] = rows();
  expect(field(peaks, "Title").value).toBe("Peaks");
  expect(field(peaks, "Type").value).toBe("bigbed");
  expect(field(peaks, "BED columns").value).toBe("bed6");
  expect(field(peaks, "Color").value).toBe("#008000");
  expect(peaks.querySelector('[aria-label="Metadata"]')?.textContent).toBe(
    "Description: Called peaks",
  );
  await enter(field(signal, "Title"), "My signal");
  await enter(field(signal, "Visibility"), "dense");

  // The batch adds nothing while any row fails, and says why on the row.
  await click(button("Add 4 tracks"));
  await vi.waitFor(() => expect(button("Remove 2 failed rows")).toBeDefined());
  expect(rows().map((row) => row.textContent?.includes("UNREACHABLE"))).toEqual([
    false,
    false,
    true,
    true,
  ]);

  // Fixing a row clears its failure; the other failed row is removed.
  await enter(field(rows()[2], "URL"), `${host}/found.bw`);
  expect(rows()[2].textContent).not.toContain("UNREACHABLE");
  await click(button("Remove 1 failed row"));
  await click(button("Add 3 tracks"));

  await vi.waitFor(() => expect(dialog()).toBeNull());
  // The session saves the whole track list, so this also shows the failed batch added nothing.
  await vi.waitFor(() => expect(savedTracks()).toHaveLength(startingTitles.length + 3));
  expect(savedTracks().slice(startingTitles.length)).toEqual([
    expect.objectContaining({
      type: "bigbed",
      base: expect.objectContaining({ title: "Peaks", color: "#008000" }),
      config: expect.objectContaining({ url: `${host}/peaks.bb`, bedSchema: "bed6" }),
      metadata: { Description: "Called peaks" },
    }),
    expect.objectContaining({
      type: "bigwig",
      base: expect.objectContaining({ title: "My signal", display: "dense" }),
      config: expect.objectContaining({ url: `${host}/signal.bw` }),
    }),
    expect.objectContaining({
      type: "bigwig",
      base: expect.objectContaining({ title: "found" }),
      config: expect.objectContaining({ url: `${host}/found.bw` }),
    }),
  ]);
});

it("adds nothing when the dialog closes while files are checked", async () => {
  server.files.set(`${host}/signal.bw`, bigWig);
  // The slow file answers only once released, after the dialog closes.
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  const serve = globalThis.fetch;
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) =>
    input === `${host}/slow.bw`
      ? released.then(() => serve(`${host}/signal.bw`, init))
      : serve(input, init),
  );
  await openDialog();
  await enter(pasteBox(), `${host}/signal.bw\n${host}/slow.bw`);
  await click(button("Review"));
  await click(button("Add 2 tracks"));
  expect(button("Checking files…")).toBeDefined();

  await click(button("Cancel"));
  await vi.waitFor(() => expect(dialog()).toBeNull());
  await act(async () => release());

  // A later add shows the stopped one added nothing, even after its checks would have ended.
  await click(button("Add tracks"));
  await enter(pasteBox(), `${host}/signal.bw`);
  await click(button("Review"));
  await click(button("Add 1 track"));
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});
