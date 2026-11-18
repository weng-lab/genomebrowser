// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type TrackFetchContext,
} from "@weng-lab/genomebrowser";
import { bigWigModule, type BigWigConfig } from "@weng-lab/genomebrowser-tracks/bigwig";
import { expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it.each([false, true])(
  "recovers pending edits after a reload without clearing invalid drafts (invalid: %s)",
  async (invalid) => {
    vi.useFakeTimers();
    let hold = false;
    let finish: (() => void) | undefined;
    const fetch = ({ signal }: TrackFetchContext<BigWigConfig>) =>
      hold
        ? new Promise<[]>((resolve, reject) => {
            finish = () => {
              signal?.removeEventListener("abort", abort);
              resolve([]);
            };
            const abort = () => reject(signal?.reason);
            signal?.addEventListener("abort", abort, { once: true });
          })
        : Promise.resolve([] as []);
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
      trackWidth: 800,
    });
    const trackStore = createTrackStore({
      modules: [{ ...bigWigModule, fetch }],
      tracks: [
        bigWigModule.create({
          base: { id: "signal", title: "Signal" },
          config: { url: "YOUR_URL_HERE" },
        }),
      ],
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
        ),
      );
      await act(async () =>
        container
          .querySelector('[aria-label="Settings for Signal"]')!
          .dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
      const input = [...container.querySelectorAll<HTMLInputElement>("input")].find((input) =>
        input.closest(".MuiTextField-root")?.textContent?.includes("Title"),
      )!;
      expect(input).toBeDefined();
      expect(container.textContent).not.toContain("Track unavailable");
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
          input,
          invalid ? "" : "Edited signal",
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      hold = true;
      await act(async () =>
        browserStore.getState().setRegion({ chromosome: "chr1", start: 2000, end: 3000 }),
      );
      expect(browserStore.getState().isLoading).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(trackStore.getState().getTrack("signal")?.base.title).toBe("Signal");
      expect(input.value).toBe(invalid ? "" : "Edited signal");
      expect(finish).toBeTypeOf("function");
      hold = false;
      await act(async () => {
        finish!();
      });
      expect(browserStore.getState().isLoading).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(container.textContent).not.toContain("Track interactions are currently blocked");
      expect(input.value).toBe(invalid ? "" : "Edited signal");
      expect(trackStore.getState().getTrack("signal")?.base.title).toBe(
        invalid ? "Signal" : "Edited signal",
      );
      expect(input.getAttribute("aria-invalid")).toBe(invalid ? "true" : "false");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  },
);
