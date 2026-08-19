import type { ReadonlyTrackInstance, TrackSettingsComponent } from "../../modules/types";
import {
  useSettingsStore,
  useTrackMutationGate,
  useTrackStore,
} from "../state/browserContextState";
import { useRegistry } from "../state/useRegistry";

export function SettingsModalController() {
  const open = useSettingsStore((state) => state.open);
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const ModalComponent = useSettingsStore((state) => state.modalComponent);
  const BaseSettingsComponent = useSettingsStore((state) => state.baseSettingsComponent);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const trackType = useTrackStore((state) => (trackId ? state.getTrack(trackId)?.type : undefined));
  const registry = useRegistry();
  const { isInteractionBlocked } = useTrackMutationGate();

  if (!open || !trackId || !trackType) return null;

  try {
    const module = registry.get(trackType);
    const ModuleSettingsComponent = module.settingsComponent;

    return (
      <ModalComponent trackId={trackId} position={position} closeSettings={closeSettings}>
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
          <BaseSettingsComponent />
          {ModuleSettingsComponent !== undefined && (
            <BoundModuleSettings trackId={trackId} component={ModuleSettingsComponent} />
          )}
        </fieldset>
      </ModalComponent>
    );
  } catch (error) {
    return <div>{error instanceof Error ? error.message : "No settings available"}</div>;
  }
}

function BoundModuleSettings({ trackId, component }: { trackId: string; component: unknown }) {
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
      updateTrack={(update) => runTrackMutation(() => updateStoredTrack(track.base.id, update))}
    />
  );
}
