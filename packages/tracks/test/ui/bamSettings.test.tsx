// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bamModule } from "@weng-lab/genomebrowser-tracks/bam";
import { BamSettings } from "../../src/bam/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});
function setup(source: "host" | "user") {
  const track = bamModule.create({
    source,
    base: { id: "bam", title: "BAM" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
  });
  const update = vi.fn(() => ({ ok: true as const }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <BamSettings
        track={track}
        displayOptions={bamModule.displays}
        updateTrack={update}
        updateTracksOfType={() => ({ ok: true })}
      />,
    ),
  );
  return update;
}
describe("BAM settings", () => {
  it("commits the index URL explicitly and exposes filtering and display controls", () => {
    const update = setup("user");
    for (const label of [
      "Display mode",
      "BAM URL",
      "BAI URL",
      "Reference 2bit URL",
      "Minimum mapping quality",
      "Reverse strand color",
      "Row height",
      "Sequence letters maximum window (bp)",
    ])
      expect(container!.textContent).toContain(label);
    const index = container!.querySelectorAll<HTMLInputElement>('input[type="url"]')[1];
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        index,
        "UPDATED_INDEX",
      );
      index.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(update).not.toHaveBeenCalled();
    act(() =>
      container!.querySelector<HTMLButtonElement>('button[aria-label="Set BAI URL"]')!.click(),
    );
    expect(update).toHaveBeenCalledWith({ config: { indexUrl: "UPDATED_INDEX" } });
    act(() => container!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(update).toHaveBeenCalledWith({ config: { showDuplicates: false } });
  });
  it("locks all host-owned source URLs while allowing display settings", () => {
    setup("host");
    const urls = container!.querySelectorAll<HTMLInputElement>('input[type="url"]');
    expect(urls).toHaveLength(3);
    expect([...urls].every((input) => input.disabled)).toBe(true);
    expect(container!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(
      false,
    );
    expect(container!.querySelector('[role="combobox"]')?.getAttribute("aria-disabled")).not.toBe(
      "true",
    );
  });
});
