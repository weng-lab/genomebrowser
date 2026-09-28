import { DefaultSettingsModal } from "../settings/DefaultSettingsModal";
import { BoundModuleSettings } from "../settings/BoundModuleSettings";
import {
  useSettingsStore,
  useRegistry,
  useTrackMutationGate,
  useGenomeBrowser,
} from "../state/browserContextState";

export function SettingsModalController() {
  const trackId = useSettingsStore((state) => state.trackId);
  const position = useSettingsStore((state) => state.position);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const { useTrackStore } = useGenomeBrowser();
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
            displayOptions={module.kind === "track" ? Object.keys(module.render) : module.displays}
          />
        </fieldset>
      </DefaultSettingsModal>
    );
  } catch (error) {
    return <div>{error instanceof Error ? error.message : "No settings available"}</div>;
  }
}
