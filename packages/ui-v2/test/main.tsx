import { createRoot } from "react-dom/client";
import folder from "./tracks.json";
import { TrackSelect } from "../src/lib";
import {
  bigBedModule,
  bigWigModule,
  createTrackStore,
} from "@weng-lab/genomebrowser-v2";

const useTrackStore = createTrackStore({
  modules: [bigWigModule, bigBedModule],
  tracks: [],
});

function Main() {
  return <TrackSelect folders={[folder]} useTrackStore={useTrackStore} />;
}

createRoot(document.getElementById("root")!).render(<Main />);
