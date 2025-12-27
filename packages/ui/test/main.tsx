import { createSelectionStore } from "../src/TrackSelect/store";
import TrackSelect from "../src/TrackSelect/TrackSelect";
import { createRoot } from "react-dom/client";

function Main() {
  const store = createSelectionStore();
  return <TrackSelect store={store} />;
}

createRoot(document.getElementById("root")!).render(<Main />);
