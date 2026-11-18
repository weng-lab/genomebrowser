import { createRoot } from "react-dom/client";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import {
  clinGenHaploModule,
  clinGenTriploModule,
  clinGenGeneDiseaseModule,
  clinGenCspecModule,
  createClinGenTrackSet,
} from "@weng-lab/genomebrowser-tracks/clingen";

const clinGen = createClinGenTrackSet();
const clinGenRegion = { chromosome: "chr17", start: 43_000_000, end: 43_100_000 };
const home = { chromosome: "chr12", start: 53356198, end: 53431525 };
const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: clinGenRegion,
  trackWidth: 1100,
});
const useTrackStore = createTrackStore({
  modules: [
    bigWigModule,
    bigBedModule,
    rulerModule,
    clinGenHaploModule,
    clinGenTriploModule,
    clinGenGeneDiseaseModule,
    clinGenCspecModule,
  ],
  tracks: [
    ...clinGen.tracks,
    rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} }),
    bigWigModule.create({
      base: {
        id: "ctcf",
        title: "Aggregate CTCF, all ENCODE biosamples",
        height: 80,
        color: "#00b3cc",
      },
      config: { url: "https://downloads.wenglab.org/CTCF_All_ENCODE_MAR20_2024_merged.bw" },
    }),
    bigWigModule.create({
      base: {
        id: "h3k27ac",
        title: "Aggregate H3K27ac, all ENCODE biosamples",
        height: 80,
        color: "#ffd600",
      },
      config: { url: "https://downloads.wenglab.org/H3K27ac_All_ENCODE_MAR20_2024_merged.bw" },
    }),
    bigWigModule.create({
      base: {
        id: "h3k4me3",
        title: "Aggregate H3K4me3, all ENCODE biosamples",
        height: 80,
        color: "#ff0000",
      },
      config: { url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw" },
    }),
    bigBedModule.create({
      base: { id: "ccres", title: "Human cCREs", display: "dense", height: 40 },
      config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed", bedSchema: "bed9" },
    }),
    bigBedModule.create({
      base: { id: "hepg2-ccres", title: "HepG2 cCREs", display: "dense", height: 40 },
      config: {
        url: "https://downloads.wenglab.org/Registry-V4/ENCFF546MZK_ENCFF732PJK_ENCFF795ONN_ENCFF357NFO.bigBed",
        bedSchema: "bed9",
      },
    }),
    bigBedModule.create({
      base: { id: "annotation-human-ccres", title: "Human cCREs", display: "dense", height: 40 },
      config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed", bedSchema: "bed9" },
    }),
    bigBedModule.create({
      base: { id: "annotation-hepg2-ccres", title: "HepG2 cCREs", display: "dense", height: 40 },
      config: {
        url: "https://downloads.wenglab.org/Registry-V4/ENCFF546MZK_ENCFF732PJK_ENCFF795ONN_ENCFF357NFO.bigBed",
        bedSchema: "bed9",
      },
    }),
  ],
  pinnedTrackIds: ["ruler"],
  trackSets: [
    ...clinGen.trackSets,
    { id: "regulatory", title: "Regulatory data", trackIds: ["h3k27ac", "h3k4me3", "ccres"] },
    {
      id: "annotations",
      title: "cCRE annotations",
      trackIds: ["annotation-human-ccres", "annotation-hepg2-ccres"],
    },
  ],
});
const theme = createTheme();
function App() {
  const hasRegulatorySet = useTrackStore((state) =>
    state.trackSets.some((trackSet) => trackSet.id === "regulatory"),
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Track sets</Typography>
          <Typography variant="body2" color="text.secondary">
            Regulatory data groups two BigWig signals and one BigBed track. A second track set, cCRE
            annotations, contains only Human and HepG2 cCRE BigBeds. Standalone CTCF and HepG2 cCRE
            tracks remain outside both track sets. Drag a track's left margin between track sets or
            outside them, or drag a track-set title to move it. The highlighted line shows the drop
            destination.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => useBrowserStore.getState().setRegion(clinGenRegion)}
            >
              ClinGen BRCA1
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                useBrowserStore
                  .getState()
                  .setRegion({ chromosome: "chr17", start: 43_050_000, end: 43_051_000 })
              }
            >
              ClinGen close-up
            </Button>
            <Button variant="outlined" onClick={() => useBrowserStore.getState().setRegion(home)}>
              SP1 region
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                useBrowserStore
                  .getState()
                  .setRegion({ chromosome: "chr12", start: 53000000, end: 54000000 })
              }
            >
              Wide region
            </Button>
            <Button
              variant="outlined"
              disabled={hasRegulatorySet}
              onClick={() =>
                useTrackStore.getState().createTrackSet({
                  id: "regulatory",
                  title: "Regulatory data",
                  trackIds: ["h3k27ac", "h3k4me3", "ccres"],
                })
              }
            >
              Create regulatory track set
            </Button>
          </Stack>
          <Box sx={{ minWidth: 0 }}>
            <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
          </Box>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
