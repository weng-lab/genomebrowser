import type { ReadonlyTrackInstance, TrackSettingsComponent } from "../../modules/types";
import { useGenomeBrowser, useTrackMutationGate } from "../state/browserContextState";

export function BoundModuleSettings({
  trackId,
  component,
  displayOptions,
}: {
  trackId: string;
  component: unknown;
  displayOptions: readonly string[];
}) {
  const { useTrackStore } = useGenomeBrowser();
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
          const state = useTrackStore.getState();
          return state.setTracks(
            state.tracks.map(function applyUpdate(candidate): typeof candidate {
              if (candidate.tracks)
                candidate = { ...candidate, tracks: candidate.tracks.map(applyUpdate) };
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
