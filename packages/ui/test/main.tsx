import TrackSelect from "../src/TrackSelect/TrackSelect"
import { createRoot } from "react-dom/client";

function Main() {
    return (
        <TrackSelect>
        </TrackSelect>
    )
}

createRoot(document.getElementById("root")!).render(
  <Main/>
);