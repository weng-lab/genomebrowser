import { useMemo } from "react";
import type { ReadonlyTrackInstance, TrackSettingsComponent } from "../../modules/types";
import { useGenomeBrowser, useRegistry, useTrackMutationGate } from "../state/browserContextState";

export function TrackSettingsPanel({
  trackId,
  scopeTrackIds,
}: {
  trackId: string;
  scopeTrackIds?: readonly string[];
}) {
  const { useTrackStore } = useGenomeBrowser();
  const scope = useMemo(
    () => (scopeTrackIds ? new Set(scopeTrackIds) : undefined),
    [scopeTrackIds],
  );
  const track = useTrackStore((state) => state.getTrack(trackId));
  const updateStoredTrack = useTrackStore((state) => state.updateTrack);
  const { runTrackMutation } = useTrackMutationGate();

  const registry = useRegistry();
  if (!track) return null;
  const module = registry.get(track.type);
  const component = module.settingsComponent;
  const displayOptions = Object.keys(module.render);
  if (!component) return null;

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
            state.tracks.map((candidate) => {
              if (candidate.type !== track.type || (scope && !scope.has(candidate.base.id)))
                return candidate;
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
