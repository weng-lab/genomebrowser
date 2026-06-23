import type { ComponentType } from "react";
import type { TrackConfigBase, TrackSettingsProps, TrackSettingsUpdate } from "../../modules/types";
import { useSettingsStore, useTrackMutationGate, useTrackStore } from "../browser-state/BrowserContext";
import { useRegistry } from "../registry/useRegistry";

export function SettingsModalController() {
  const registry = useRegistry();
  const open = useSettingsStore((state) => state.open);
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const ModalComponent = useSettingsStore((state) => state.modalComponent);
  const BaseSettingsComponent = useSettingsStore((state) => state.baseSettingsComponent);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const track = useTrackStore((state) => (trackId ? state.getTrack(trackId) : undefined));
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();

  if (!open || !track) return null;

  try {
    const module = registry.get(track.type);
    const ModuleSettingsComponent = module.settingsComponent as
      | ComponentType<TrackSettingsProps<TrackConfigBase>>
      | undefined;
    const updateActiveTrack = (partial: TrackSettingsUpdate<TrackConfigBase>) => {
      return runTrackMutation(() => updateTrack(track.id, partial));
    };

    return (
      <ModalComponent
        track={track}
        title={`Configure ${track.title}`}
        position={position}
        closeSettings={closeSettings}
      >
        <div
          aria-disabled={isInteractionBlocked}
          style={{ pointerEvents: isInteractionBlocked ? "none" : undefined }}
        >
          <BaseSettingsComponent
            config={track}
            displayOptions={Object.keys(module.render)}
            updateTrack={updateActiveTrack}
          />
          {ModuleSettingsComponent && (
            <ModuleSettingsComponent config={track} updateTrack={updateActiveTrack} />
          )}
        </div>
      </ModalComponent>
    );
  } catch (error) {
    return (
      <ModalComponent
        track={track}
        title={`Configure ${track.title}`}
        position={position}
        closeSettings={closeSettings}
      >
        <div>{error instanceof Error ? error.message : "No settings available"}</div>
      </ModalComponent>
    );
  }
}
