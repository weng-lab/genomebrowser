import { createRoot } from "react-dom/client";
import { useState } from "react";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { dynseqModule } from "../../src/dynseq";
import { bigWigModule } from "../../src/bigwig";

const url = new URL("/scores.bw", location.href).href;
const twoBitUrl = new URL("/reference.2bit", location.href).href;
const useBrowserStore = createBrowserStore({
  assembly: { id: "test", chromosomes: { chr1: 12000 } },
  region: { chromosome: "chr1", start: 0, end: 12000 },
  trackWidth: 600,
  marginWidth: 100,
});
const dynseqStore = createTrackStore({
  modules: [dynseqModule],
  tracks: [
    dynseqModule.create({
      base: { id: "signal", title: "Signal" },
      config: { url, twoBitUrl },
    }),
  ],
});
const bigwigStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      base: { id: "signal", title: "Signal" },
      config: { url },
    }),
  ],
});
function App() {
  const [width, setWidth] = useState(1100);
  const region = useBrowserStore((state) => state.region);
  const setRegion = useBrowserStore((state) => state.setRegion);
  return (
    <>
      <button onClick={() => setRegion({ chromosome: "chr1", start: 0, end: 12000 })}>Wide</button>
      <button onClick={() => setRegion({ chromosome: "chr1", start: 190, end: 290 })}>
        Sequence
      </button>
      <button onClick={() => setRegion({ chromosome: "chr1", start: 450, end: 550 })}>
        Negative
      </button>
      <button onClick={() => setWidth(300)}>Narrow</button>
      <button onClick={() => setWidth(800)}>Buffer width</button>
      <button onClick={() => setWidth(1100)}>Expand</button>
      <button onClick={() => useBrowserStore.getState().setBasePairDetail({ maxVisibleBases: 50 })}>
        Hide letters
      </button>
      <button
        onClick={() => useBrowserStore.getState().setBasePairDetail({ maxVisibleBases: 100 })}
      >
        Show letters
      </button>
      <button
        onClick={() =>
          dynseqStore.getState().updateTrack("signal", {
            config: { twoBitUrl: new URL("/broken.2bit", location.href).href },
          })
        }
      >
        Break reference
      </button>
      <button
        onClick={() => dynseqStore.getState().updateTrack("signal", { config: { twoBitUrl } })}
      >
        Restore reference
      </button>
      <button
        onClick={() => {
          for (const store of [dynseqStore, bigwigStore])
            store.getState().updateTrack("signal", { base: { display: "dense" } });
        }}
      >
        Dense
      </button>
      <button
        onClick={() => {
          for (const store of [dynseqStore, bigwigStore])
            store.getState().updateTrack("signal", { base: { display: "full" } });
        }}
      >
        Full
      </button>
      <button
        onClick={() => {
          for (const store of [dynseqStore, bigwigStore])
            store.getState().updateTrack("signal", {
              config: { yRange: { min: -2, max: 2 }, fillWithZero: true },
            });
        }}
      >
        Clamp
      </button>
      <output>
        {region.start}:{region.end}
      </output>
      <section id="dynseq" aria-label="Dynseq" style={{ width }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={dynseqStore} />
      </section>
      <section id="bigwig" aria-label="BigWig" style={{ width }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={bigwigStore} />
      </section>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
