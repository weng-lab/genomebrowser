import type { TrackStore } from "@weng-lab/genomebrowser-v2";
import type { TrackSelectColumnOverrides } from "../catalog/catalogColumns";
import { ConfirmDialog } from "../dialogs/confirmDialog";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { TrackSelectProvider, useTrackSelect } from "../session/trackSelectContext";
import { useTrackSelectState } from "../session/useTrackSelectState";
import { TrackSelectActionBar } from "./trackSelectActionBar";
import { TrackSelectBody } from "./trackSelectBody";
import { TrackSelectSubmitError } from "./trackSelectSubmitError";
import { TrackSelectToolbar } from "./trackSelectToolbar";

type TrackSelectContentProps = {
  trackCatalogs: TrackSelectCatalog[];
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  setTracks: TrackStore["setTracks"];
  defaultTrackIds?: readonly string[];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  maxTracks: number;
  onClose: () => void;
  columnOverrides?: TrackSelectColumnOverrides;
};

export function TrackSelectContent(props: TrackSelectContentProps) {
  const trackSelect = useTrackSelectState(props);

  return (
    <TrackSelectProvider value={trackSelect}>
      <TrackSelectToolbar />
      <TrackSelectBody columnOverrides={props.columnOverrides} />
      <TrackSelectSubmitError />
      <TrackSelectActionBar />
      <TrackSelectLimitDialog />
    </TrackSelectProvider>
  );
}

function TrackSelectLimitDialog() {
  const { state, actions, meta } = useTrackSelect();

  return (
    <ConfirmDialog
      open={state.limitDialogOpen}
      title="Track limit reached"
      text={`Select ${meta.maxTracks.toLocaleString()} tracks or fewer.`}
      onClose={actions.closeLimitDialog}
    />
  );
}
