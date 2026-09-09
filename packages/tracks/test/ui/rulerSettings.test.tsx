// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import {
  createBrowserStore,
  createTrackStore,
  createSettingsStore,
  createContextMenuStore,
} from "@weng-lab/genomebrowser";
import { BrowserContext } from "../../../core/src/browser/state/browserContextState";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { RulerSettings } from "../../src/ruler/settings";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
it("exposes config fields and preserves host ownership", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 1000,
  });
  const context = {
    browserStore: useBrowserStore,
    trackStore: createTrackStore({ modules: [], tracks: [] }),
    settingsStore: createSettingsStore(),
    contextMenuStore: createContextMenuStore(),
  };
  const render = (children: ReactNode) =>
    root.render(<BrowserContext value={context}>{children}</BrowserContext>);
  const updateTrack = vi.fn(() => ({ ok: true as const }));
  try {
    const track = rulerModule.create({
      id: "ruler",
      title: "Reference",
      source: "host",
      config: {},
    });
    act(() => render(<RulerSettings track={track} updateTrack={updateTrack} />));
    const labels = Array.from(container.querySelectorAll("label"));
    const input = (label: string) =>
      container.querySelector<HTMLInputElement>(
        `[id="${labels.find((item) => item.textContent === label)?.htmlFor}"]`,
      )!;
    expect(input("2bit URL").disabled).toBe(true);
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.checked).toBe(false);
    act(() => checkbox.click());
    expect(updateTrack).toHaveBeenLastCalledWith({ config: { distinguishMaskedBases: true } });
    expect(container.textContent).not.toContain("Bases appear when each");
    const slider = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(slider.getAttribute("aria-label")).toBe("When to show DNA letters");
    expect(slider.min).toBe("5");
    expect(slider.max).toBe("25");
    expect(slider.value).toBe("15");
    expect(slider.disabled).toBe(false);
    const zoomButton = container.querySelector<HTMLButtonElement>("button")!;
    expect(container.textContent).toContain("Sequence appears at 66 bp or less.");
    expect(zoomButton.disabled).toBe(true);
    act(() => useBrowserStore.getState().setTrackWidth(2000));
    expect(container.textContent).toContain("Sequence appears at 133 bp or less.");
    act(() =>
      render(
        <RulerSettings
          track={{
            ...track,
            config: {
              ...track.config,
              sequenceUrl: "https://example.test/ref.2bit",
              sequenceMinPixelsPerBase: 10,
            },
          }}
          updateTrack={updateTrack}
        />,
      ),
    );
    expect(container.textContent).toContain("Sequence appears at 200 bp or less.");
    expect(zoomButton.disabled).toBe(false);
    act(() => zoomButton.click());
    expect(useBrowserStore.getState().region).toEqual({
      chromosome: "chr1",
      start: 1400,
      end: 1600,
    });
    expect(zoomButton.disabled).toBe(true);

    act(() =>
      render(<RulerSettings track={{ ...track, source: "user" }} updateTrack={updateTrack} />),
    );
    expect(input("2bit URL").disabled).toBe(false);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
