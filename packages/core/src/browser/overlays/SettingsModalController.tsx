import { DefaultSettingsModal } from "../settings/DefaultSettingsModal";
import type { ReadonlyTrackInstance, TrackSettingsComponent } from "../../modules/types";
import {
  useSettingsStore,
  useTrackMutationGate,
  useTrackStore,
  useTrackStoreApi,
} from "../state/browserContextState";
import { useRegistry } from "../state/useRegistry";

export function SettingsModalController() {
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const trackType = useTrackStore((state) => (trackId ? state.getTrack(trackId)?.type : undefined));
  const registry = useRegistry();
  const { isInteractionBlocked } = useTrackMutationGate();

  if (!trackId || !trackType) return null;

  try {
    const module = registry.get(trackType);
    const ModuleSettingsComponent = module.settingsComponent;
    if (!ModuleSettingsComponent) return null;

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
          <BoundModuleSettings
            trackId={trackId}
            component={ModuleSettingsComponent}
            displayOptions={Object.keys(module.render)}
          />
        </fieldset>
      </DefaultSettingsModal>
    );
  } catch (error) {
    return <div>{error instanceof Error ? error.message : "No settings available"}</div>;
  }
}

function BoundModuleSettings({
  trackId,
  component,
  displayOptions,
}: {
  trackId: string;
  component: unknown;
  displayOptions: readonly string[];
}) {
  const useStore = useTrackStoreApi();
  const track = useTrackStore((state) => state.getTrack(trackId));
  const updateStoredTrack = useTrackStore((state) => state.updateTrack);
  const { runTrackMutation } = useTrackMutationGate();

  if (!track) return null;

  const ModuleSettingsComponent = component as TrackSettingsComponent<
    Record<string, unknown>,
    unknown
  >;
  const settingsTrack = track as ReadonlyTrackInstance<Record<string, unknown>, unknown>;

  return (
    <ModuleSettingsComponent
      track={settingsTrack}
      displayOptions={displayOptions}
      updateTracksOfType={(createUpdate) =>
        runTrackMutation(() => {
          const state = useStore.getState();
          return state.setTracks(
            state.tracks.map((candidate) => {
              if (candidate.type !== track.type) return candidate;
              const update = createUpdate(candidate as typeof settingsTrack);
              return {
                ...candidate,
                base: { ...candidate.base, ...update.base, id: candidate.base.id },
                config: { ...candidate.config, ...update.config },
                ...(update.interaction
                  ? { interaction: { ...candidate.interaction, ...update.interaction } }
                  : {}),
              };
            }),
          );
        })
      }
      updateTrack={(update) => runTrackMutation(() => updateStoredTrack(track.base.id, update))}
    />
  );
}
