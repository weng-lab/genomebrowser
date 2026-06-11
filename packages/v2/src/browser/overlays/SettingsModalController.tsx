import type { ComponentType } from "react";
import type { createModuleRegistry } from "../../modules/registry";
import type { TrackConfigBase, TrackSettingsProps, TrackSettingsUpdate } from "../../modules/types";
import { useSettingsStore, useTrackStore } from "../../stores/BrowserContext";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function SettingsModalController({ registry }: { registry: ModuleRegistry }) {
  const open = useSettingsStore((state) => state.open);
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const ModalComponent = useSettingsStore((state) => state.modalComponent);
  const BaseSettingsComponent = useSettingsStore((state) => state.baseSettingsComponent);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const track = useTrackStore((state) => (trackId ? state.getTrack(trackId) : undefined));
  const updateTrack = useTrackStore((state) => state.updateTrack);

  if (!open || !track) return null;

  try {
    const module = registry.get(track.type);
    const validatedTrack = module.validate(track);
    const ModuleSettingsComponent = module.settingsComponent as
      | ComponentType<TrackSettingsProps<TrackConfigBase>>
      | undefined;
    const updateActiveTrack = (partial: TrackSettingsUpdate<TrackConfigBase>) => {
      updateTrack(validatedTrack.id, partial);
    };

    return (
      <ModalComponent
        track={validatedTrack}
        title={`Configure ${validatedTrack.title}`}
        position={position}
        closeSettings={closeSettings}
      >
        <BaseSettingsComponent
          config={validatedTrack}
          displayOptions={Object.keys(module.render)}
          updateTrack={updateActiveTrack}
        />
        {ModuleSettingsComponent && (
          <ModuleSettingsComponent config={validatedTrack} updateTrack={updateActiveTrack} />
        )}
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
