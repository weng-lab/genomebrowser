import { TrackDownloadControls } from "../download/TrackDownloadControls";
import { DefaultSettingsModal } from "../settings/DefaultSettingsModal";
import type { ComponentType } from "react";
import type { TrackSetSettingsProps } from "../state/trackSets";
import { TrackSettingsPanel } from "../settings/TrackSettingsPanel";
import {
  useSettingsStore,
  useRegistry,
  useTrackMutationGate,
  useGenomeBrowser,
} from "../state/browserContextState";

export function SettingsModalController({
  trackSetSettingsComponent: TrackSetSettings,
}: { trackSetSettingsComponent?: ComponentType<TrackSetSettingsProps> } = {}) {
  const trackSetId = useSettingsStore((state) => state.trackSetId);
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const { useTrackStore } = useGenomeBrowser();
  const trackType = useTrackStore((state) => (trackId ? state.getTrack(trackId)?.type : undefined));
  const registry = useRegistry();
  const { isInteractionBlocked } = useTrackMutationGate();

  if (trackSetId && TrackSetSettings)
    return (
      <TrackSetSettings key={trackSetId} trackSetId={trackSetId} closeSettings={closeSettings} />
    );
  if (!trackId || !trackType) return null;

  try {
    const module = registry.get(trackType);
    const ModuleSettingsComponent = module.settingsComponent;

    return (
      <DefaultSettingsModal trackId={trackId} position={position} closeSettings={closeSettings}>
        <fieldset
          key={trackId}
          disabled={isInteractionBlocked}
          style={{
            border: 0,
            display: "grid",
            gap: "12px",
            margin: 0,
            minWidth: 0,
            padding: 0,
          }}
        >
          {ModuleSettingsComponent ? <TrackSettingsPanel trackId={trackId} /> : null}
          <TrackDownloadControls trackId={trackId} />
        </fieldset>
      </DefaultSettingsModal>
    );
  } catch (error) {
    return <div>{error instanceof Error ? error.message : "No settings available"}</div>;
  }
}
