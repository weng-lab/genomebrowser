// @vitest-environment jsdom

import { createBrowserStore, type BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadImageDialog, ManagementControls } from "../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const hook = vi.hoisted(() => ({
  download: vi.fn<(format: string, options?: { scale?: number }) => Promise<boolean>>(),
  error: null as string | null,
}));

// The export itself is covered in core; these tests cover the control around it.
vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useBrowserDownload: () => ({
    download: hook.download,
    isDownloading: false,
    error: hook.error,
    defaultFilename: "genome-browser_chr1_101-200",
  }),
}));

const defaults = { includeTitles: true, includeRuler: true, filename: "" };

let container: HTMLDivElement | undefined;
let root: Root | undefined;

beforeEach(() => {
  hook.download.mockReset();
  hook.download.mockResolvedValue(true);
  hook.error = null;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("DownloadImageDialog opened from the Manage group", () => {
  it("opens named download options and downloads SVG by default, then closes", async () => {
    const browserStore = mountControls();
    expect(browserStore).toBeDefined();
    const trigger = getButton("Download image");
    expect(dialog()).toBeNull();

    act(() => trigger.click());
    expect(dialog()?.textContent).toContain("Download image");
    expect(getRadio("SVG").checked).toBe(true);
    expect(dialog()?.textContent).not.toContain("Resolution");

    await clickAndSettle("Download SVG");
    expect(hook.download).toHaveBeenCalledWith("svg", defaults);
    await settle();
    expect(dialog()).toBeNull();
  });

  it("offers PNG resolutions and passes the chosen scale", async () => {
    mountControls();
    act(() => getButton("Download image").click());
    act(() => getRadio("PNG").click());
    expect(dialog()?.textContent).toContain("Resolution");
    expect(getRadio("2×").checked).toBe(true);
    act(() => getRadio("3×").click());

    await clickAndSettle("Download PNG");
    expect(hook.download).toHaveBeenCalledWith("png", { ...defaults, scale: 3 });
  });

  it("keeps the dialog open after a failure and keeps choices when reopened", async () => {
    hook.download.mockResolvedValue(false);
    hook.error = "The image is too large for PNG.";
    mountControls();
    act(() => getButton("Download image").click());
    act(() => getRadio("PNG").click());

    await clickAndSettle("Download PNG");
    expect(dialog()).not.toBeNull();
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain("too large for PNG");

    act(() => getButton("Cancel").click());
    await settle();
    act(() => getButton("Download image").click());
    expect(getRadio("PNG").checked).toBe(true);
  });

  it("passes the chosen contents and keeps them when reopened", async () => {
    mountControls();
    act(() => getButton("Download image").click());
    expect(getInput("checkbox", "Track titles").checked).toBe(true);
    expect(getInput("checkbox", "Ruler").checked).toBe(true);
    expect(dialog()?.textContent).not.toContain("Margin");
    act(() => getInput("checkbox", "Track titles").click());
    act(() => getInput("checkbox", "Ruler").click());

    await clickAndSettle("Download SVG");
    expect(hook.download).toHaveBeenCalledWith("svg", {
      ...defaults,
      includeTitles: false,
      includeRuler: false,
    });
    act(() => getButton("Download image").click());
    expect(getInput("checkbox", "Track titles").checked).toBe(false);
    expect(getInput("checkbox", "Ruler").checked).toBe(false);
  });

  it("shows the default file name and passes a typed one for this download only", async () => {
    mountControls();
    act(() => getButton("Download image").click());
    const field = getFilenameField();
    expect(field.placeholder).toBe("genome-browser_chr1_101-200");
    expect(field.value).toBe("");
    expect(field.parentElement?.textContent).toContain(".svg");
    act(() => getRadio("PNG").click());
    expect(getFilenameField().parentElement?.textContent).toContain(".png");
    act(() => getRadio("SVG").click());

    typeInto(getFilenameField(), "Figure 1");
    await clickAndSettle("Download SVG");
    expect(hook.download).toHaveBeenCalledWith("svg", { ...defaults, filename: "Figure 1" });
    await settle();
    act(() => getButton("Download image").click());
    expect(getFilenameField().value).toBe("");
  });

  it("waits for tracks to finish loading", () => {
    const browserStore = mountControls();
    act(() => browserStore.setState({ isLoading: true }));
    act(() => getButton("Download image").click());
    expect(getButton("Download SVG").disabled).toBe(true);
    expect(dialog()?.textContent).toContain("Waiting for tracks to finish loading");
    act(() => browserStore.setState({ isLoading: false }));
    expect(getButton("Download SVG").disabled).toBe(false);
  });

  it("does not start a download when closed before preparation begins", async () => {
    mountControls();
    act(() => getButton("Download image").click());
    act(() => getButton("Download SVG").click());
    expect(dialog()?.textContent).toContain("Preparing image");
    act(() => getButton("Close download image").click());
    await settle();
    expect(hook.download).not.toHaveBeenCalled();
  });
});

// Hosts own dialog visibility, as the web app does.
function Host({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ManagementControls onDownloadImage={() => setOpen(true)} />
      <DownloadImageDialog browserStore={browserStore} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function mountControls(): BrowserStoreInstance {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1_000 } },
    region: { chromosome: "chr1", start: 100, end: 200 },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<Host browserStore={browserStore} />));
  return browserStore;
}

function dialog() {
  return document.body.querySelector('[role="dialog"]');
}

function getButton(name: string) {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      candidate.textContent?.trim() === name || candidate.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Could not find button named ${name}`);
  return button;
}

function getInput(type: "radio" | "checkbox", label: string) {
  const input = Array.from(
    document.body.querySelectorAll<HTMLInputElement>(`input[type=${type}]`),
  ).find((candidate) => candidate.closest("label")?.textContent?.startsWith(label));
  if (!input) throw new Error(`Could not find ${type} ${label}`);
  return input;
}

function getFilenameField() {
  const label = Array.from(document.body.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === "File name",
  );
  const field = label && document.getElementById(label.htmlFor);
  if (!(field instanceof HTMLInputElement)) throw new Error("Could not find the file name field");
  return field;
}

function typeInto(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function getRadio(label: string) {
  return getInput("radio", label);
}

// Let the next paint, the download, and the dialog transition finish.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

async function clickAndSettle(name: string) {
  act(() => getButton(name).click());
  await settle();
}
