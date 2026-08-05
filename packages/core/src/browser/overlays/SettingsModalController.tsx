import type { ComponentType } from "react";
import type { ReadonlyTrackInstance, TrackSettingsProps } from "../../modules/types";
import {
  useSettingsStore,
  useTrackMutationGate,
  useTrackStore,
} from "../state/browserContextState";
import { useRegistry } from "../state/useRegistry";

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
      | ComponentType<TrackSettingsProps<unknown>>
      | undefined;
    const updateActiveTrack: TrackSettingsProps<unknown>["updateTrack"] = (update) => {
      return runTrackMutation(() => updateTrack(track.base.id, update));
    };

    return (
      <ModalComponent
        track={track}
        title={`Configure ${track.base.title}`}
        position={position}
        closeSettings={closeSettings}
      >
        <div
          key={track.base.id}
          aria-disabled={isInteractionBlocked}
          style={{
            display: "grid",
            gap: "12px",
            minWidth: 0,
            pointerEvents: isInteractionBlocked ? "none" : undefined,
          }}
        >
          <BaseSettingsComponent
            base={track.base}
            displayOptions={Object.keys(module.render)}
            updateTrack={updateActiveTrack}
          />
          {ModuleSettingsComponent && (
            <ModuleSettingsComponent
              track={track as ReadonlyTrackInstance<unknown>}
              updateTrack={updateActiveTrack}
            />
          )}
        </div>
      </ModalComponent>
    );
  } catch (error) {
    return (
      <ModalComponent
        track={track}
        title={`Configure ${track.base.title}`}
        position={position}
        closeSettings={closeSettings}
      >
        <div>{error instanceof Error ? error.message : "No settings available"}</div>
      </ModalComponent>
    );
  }
}
