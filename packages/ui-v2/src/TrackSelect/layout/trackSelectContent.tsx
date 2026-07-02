import type { TrackStore } from "@weng-lab/genomebrowser-v2";
import { ConfirmDialog } from "../dialogs/confirmDialog";
import type { TrackSelectFolder } from "../schema/folderSchema";
import {
  TrackSelectProvider,
  useTrackSelect,
} from "../session/trackSelectContext";
import { useTrackSelectState } from "../session/useTrackSelectState";
import { TrackSelectActionBar } from "./trackSelectActionBar";
import { TrackSelectBody } from "./trackSelectBody";
import { TrackSelectSubmitError } from "./trackSelectSubmitError";
import { TrackSelectToolbar } from "./trackSelectToolbar";

type TrackSelectContentProps = {
  folders: TrackSelectFolder[];
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  addTrack: TrackStore["addTrack"];
  removeTrack: TrackStore["removeTrack"];
  maxTracks: number;
  onClose: () => void;
};

export function TrackSelectContent(props: TrackSelectContentProps) {
  const trackSelect = useTrackSelectState(props);

  return (
    <TrackSelectProvider value={trackSelect}>
      <TrackSelectToolbar />
      <TrackSelectBody />
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
