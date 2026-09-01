import type { TrackStore } from "@weng-lab/genomebrowser";
import type { TrackSelectColumnOverrides } from "../collection/collectionColumns";
import type { CompiledTrackCollections } from "../collection/collectionCompilation";
import type { TrackSelectInteractionResolver } from "../collection/collectionInteraction";
import { ConfirmDialog } from "../dialogs/confirmDialog";
import { useTrackSelect } from "../session/trackSelectContext";
import { TrackSelectProvider } from "../session/TrackSelectProvider";
import { useTrackSelectState } from "../session/useTrackSelectState";
import { TrackSelectActionBar } from "./trackSelectActionBar";
import { TrackSelectBody } from "./trackSelectBody";
import { TrackSelectSubmitError } from "./trackSelectSubmitError";
import { TrackSelectToolbar } from "./trackSelectToolbar";

type TrackSelectContentProps = {
  compiledCollections: CompiledTrackCollections;
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  setTracks: TrackStore["setTracks"];
  defaultTrackIds?: readonly string[];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  maxTracks: number;
  onClose: () => void;
  columnOverrides?: TrackSelectColumnOverrides;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
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
