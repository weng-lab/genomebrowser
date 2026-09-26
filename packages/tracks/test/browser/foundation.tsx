import { createRoot } from "react-dom/client";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const useBrowserStore = createBrowserStore({
  assembly: { id: "fixture", chromosomes: { chr1: 12000 } },
  region: { chromosome: "chr1", start: 190, end: 790 },
  trackWidth: 600,
  marginWidth: 100,
});
const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      base: { id: "signal", title: "Fixture signal", height: 160, color: "#2266aa" },
      config: { url: new URL("/scores.bw", location.href).href, yRange: { min: -10, max: 10 } },
    }),
  ],
});

function App() {
  const region = useBrowserStore((state) => state.region);
  return (
    <>
      <output aria-label="Visible region">
        {region.chromosome}:{region.start}-{region.end}
      </output>
      <section id="browser" aria-label="Genome browser" style={{ width: 700 }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </section>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
