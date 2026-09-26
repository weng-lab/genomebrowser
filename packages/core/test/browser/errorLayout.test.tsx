import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createBrowserStore, createTrackStore, defineTrackModule, hg38 } from "../../src/lib";
import type { TrackStoreInstance } from "../../src/lib";
import { BrowserProvider } from "../../src/browser/state/BrowserContext";
import { idleDataSource } from "./idleDataSource";
import { createBrowserContextValue } from "../../src/browser/state/browserContextState";
import { TrackContent } from "../../src/browser/track-row/TrackContent";

// Preserve these existing layout guards until real-browser tests verify scrolling
// and short-track fit. Static markup checks cannot establish actual visual fit,
// but removing them before that replacement would lose the current protection.
describe("fetch error layout guards", () => {
  const region = { chromosome: "chr1", start: 0, end: 10 };

  it("constrains fetch errors to a scrollable track region", () => {
    const module = defineTrackModule({
      type: "error-alignment-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({ base: { id: "error", title: "Error", height: 60 }, config: {} });
    const useTrackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <BrowserProvider value={browserContext(useTrackStore)}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          visibleRegion={region}
          region={region}
          width={100}
          height={track.base.height}
        />
      </BrowserProvider>,
    );

    expect(markup).toContain('<foreignObject x="0" y="0" width="100" height="60"');
    expect(markup).toContain("Track error");
    expect(markup).toContain("overflow:auto");
    expect(markup).toContain("Failed to load");
  });

  it("keeps error text within short tracks", () => {
    const module = defineTrackModule({
      type: "short-error-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({
      base: {
        id: "short-error",
        title: "Short error",
        height: 10,
      },
      config: {},
    });
    const useTrackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <BrowserProvider value={browserContext(useTrackStore)}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          visibleRegion={region}
          region={region}
          width={100}
          height={track.base.height}
        />
      </BrowserProvider>,
    );

    expect(markup).not.toContain("<svg");
    expect(markup).toContain("font:10px sans-serif");
    expect(markup).toContain('height="10"');
  });
});

function browserContext(trackStore: TrackStoreInstance) {
  const browserStore = createBrowserStore({
    assembly: hg38,
    region: { chromosome: "chr1", start: 0, end: 10 },
  });
  return createBrowserContextValue(browserStore, trackStore, idleDataSource, () => false);
}
