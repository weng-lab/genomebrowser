import type { ReadonlyTrackInstance, TrackSettingsComponent } from "../../modules/types";
import { useGenomeBrowser, useTrackMutationGate } from "../state/browserContextState";

/** Renders a registered track's settings within its hosting browser. */
export function TrackSettings({ trackId }: { trackId: string }) {
  const { useTrackStore } = useGenomeBrowser();
  const track = useTrackStore((state) => state.getTrack(trackId));
  const registry = useTrackStore((state) => state.registry);
  const updateStoredTrack = useTrackStore((state) => state.updateTrack);
  const { runTrackMutation } = useTrackMutationGate();

  if (!track) return null;
  const module = registry.get(track.type);
  if (!module.settingsComponent) return null;
  const displayOptions = module.kind === "track" ? Object.keys(module.render) : module.displays;

  const ModuleSettingsComponent = module.settingsComponent as TrackSettingsComponent<
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
