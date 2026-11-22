// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";
import { bigBedWithColumns, trackFiles } from "./trackFiles";

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

const { bigWig, bed6 } = trackFiles;
const host = "https://data.example.test";
const startingTitles = ["Coordinates", "GENCODE 50 basic", "Human cCREs"];

const savedTracks = () => server.stored.get(id)!.snapshot.tracks;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const button = (label: string) =>
  [...document.querySelectorAll("button")].find((element) => element.textContent === label);
const rows = () => [...dialog()!.querySelectorAll('[aria-label="Tracks to add"] > li')];
// MUI's multiline field also renders a hidden copy for measuring.
const pasteBox = () => dialog()!.querySelector<HTMLTextAreaElement>("textarea:not([aria-hidden])")!;

/** The button in `element` labeled `label`. */
const within = (element: Element, label: string) =>
  [...element.querySelectorAll("button")].find((candidate) => candidate.textContent === label);

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
    `track type=bigBed 6 name="peaks" bigDataUrl=${host}/peaks.bb color=0,128,0 description="Called peaks" priority=1`,
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
  expect(field(peaks, "Title").value).toBe("peaks");
  expect(field(peaks, "Type").value).toBe("bigbed");
  expect(field(peaks, "BED columns").value).toBe("bed6");
  expect(field(peaks, "Color").value).toBe("#008000");
  expect([field(peaks, "Field").value, field(peaks, "Value").value]).toEqual([
    "Description",
    "Called peaks",
  ]);
  // A URL alone shows the title its file name gives it.
  expect(rows().map((row) => field(row, "Title").value)).toEqual([
    "peaks",
    "signal",
    "missing",
    "gone",
  ]);
  await enter(field(signal, "Title"), "My signal");
  await enter(field(signal, "Visibility"), "dense");

  // A metadata field without a value, or named like a track's own values, stops the add before
  // any file is checked.
  const failing = (reason: string) => rows().map((row) => row.textContent?.includes(reason));
  await click(within(signal, "Add metadata field"));
  await enter(field(signal, "Field"), "Replicate");
  await click(button("Add 4 tracks"));
  expect(failing('Enter a value for "Replicate"')).toEqual([false, true, false, false]);
  await enter(field(signal, "Field"), "title");
  await enter(field(signal, "Value"), "2");
  await click(button("Add 4 tracks"));
  expect(failing("can't be named")).toEqual([false, true, false, false]);
  await enter(field(signal, "Field"), "Replicate");

  // The batch adds nothing while any row fails, and says why on the row.
  await enter(field(peaks, "Color"), "green");
  await click(button("Add 4 tracks"));
  await vi.waitFor(() => expect(button("Remove 3 failed rows")).toBeDefined());
  expect(failing("INVALID_COLOR")).toEqual([true, false, false, false]);
  expect(failing("UNREACHABLE")).toEqual([false, false, true, true]);

  // Fixing a row clears its failure, and its title follows the new file; the other failed row
  // is removed.
  await enter(field(peaks, "Color"), "#008000");
  await enter(field(rows()[2], "URL"), `${host}/found.bw`);
  expect(rows()[2].textContent).not.toContain("UNREACHABLE");
  expect(field(rows()[2], "Title").value).toBe("found");
  // A title the track line names stays, even one that matches the file name.
  await enter(field(peaks, "URL"), `${host}/moved.bb`);
  expect(field(peaks, "Title").value).toBe("peaks");
  await enter(field(peaks, "URL"), `${host}/peaks.bb`);
  await click(button("Remove 1 failed row"));
  await click(button("Add 3 tracks"));

  await vi.waitFor(() => expect(dialog()).toBeNull());
  // The session saves the whole track list, so this also shows the failed batch added nothing.
  await vi.waitFor(() => expect(savedTracks()).toHaveLength(startingTitles.length + 3));
  expect(savedTracks().slice(startingTitles.length)).toEqual([
    expect.objectContaining({
      type: "bigbed",
      base: expect.objectContaining({ title: "peaks", color: "#008000" }),
      config: expect.objectContaining({ url: `${host}/peaks.bb`, bedSchema: "bed6" }),
      metadata: { Description: "Called peaks" },
    }),
    expect.objectContaining({
      type: "bigwig",
      base: expect.objectContaining({ title: "My signal", display: "dense" }),
      config: expect.objectContaining({ url: `${host}/signal.bw` }),
      metadata: { Replicate: "2" },
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
  // The slow file answers only once released, after Cancel.
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
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

  // The checks end while the dialog fades out, before it unmounts its content.
  await click(button("Cancel"));
  expect(dialog()).not.toBeNull();
  await act(async () => release());
  await vi.waitFor(() => expect(dialog()).toBeNull());

  // A later add shows the stopped one added nothing, even after its checks would have ended.
  await click(button("Add tracks"));
  await enter(pasteBox(), `${host}/signal.bw`);
  await click(button("Review"));
  await click(button("Add 1 track"));
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("reads an uploaded file, and says which BED columns a BigBed header chooses and what color changes", async () => {
  server.files.set(`${host}/peaks.bb`, bed6);
  server.files.set(`${host}/colored.bb`, bigBedWithColumns(9, 9));
  await openDialog();
  const input = dialog()!.querySelector<HTMLInputElement>('input[type="file"]')!;
  const text = `${host}/peaks.bb\n${host}/colored.bb\n`;
  // jsdom's File lacks text(), which browsers have.
  const file = Object.assign(new File([text], "tracks.txt"), { text: async () => text });
  Object.defineProperty(input, "files", { value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));

  // Uploading reviews the file's lines as if they were pasted.
  await vi.waitFor(() => expect(rows()).toHaveLength(2));
  const [peaks, colored] = rows();
  const headerChoice = (row: Element) => field(row, "BED columns").options[0].textContent;
  const colorHint = (row: Element) =>
    field(row, "Color").closest(".MuiFormControl-root")!.textContent;
  await vi.waitFor(() => {
    expect(headerChoice(peaks)).toBe("From the file's header: bed6");
    expect(headerChoice(colored)).toBe("From the file's header: bed9");
  });
  // A file with its own colors keeps them, so the track color only marks the track.
  expect(colorHint(peaks)).toContain("Colors every feature.");
  expect(colorHint(colored)).toContain("only the strip at the track's left edge");
  await enter(field(colored, "BED columns"), "bed6");
  expect(colorHint(colored)).toContain("Colors every feature.");
});
