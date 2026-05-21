import {
  GenomeBrowser,
  bigWig,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
} from "./index";

const browserStore = createBrowserStore({
  region: "chr19:44,905,754-44,907,754",
});

const trackStore = createTrackStore([
  bigWig({
    id: "dnase",
    title: "DNase aggregate",
    color: "#1B2021",
    url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
  }),
  bigWig({
    id: "atac",
    title: "atac aggregate",
    color: "#51513D",
    url: "https://downloads.wenglab.org/ATAC_All_ENCODE_MAR20_2024_merged.bw",
  }),
  bigWig({
    id: "awsd",
    title: "atac aggregate",
    color: "#A6A867",
    url: "https://downloads.wenglab.org/ATAC_All_ENCODE_MAR20_2024_merged.bw",
  }),
  bigWig({
    id: "atadwadwc",
    title: "atac aggregate",
    color: "#E3DC95",
    url: "https://downloads.wenglab.org/ATAC_All_ENCODE_MAR20_2024_merged.bw",
  }),
]);

const modules = [bigWigModule];

export default function App() {
  return (
    <GenomeBrowser
      browserStore={browserStore}
      trackStore={trackStore}
      modules={modules}
    />
  );
}
