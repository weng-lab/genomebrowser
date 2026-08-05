import type { BigBedConfig, TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSourceUrlField } from "../../TrackSettings/trackSourceUrlField";

export function BigBedSettings({ config, updateConfig }: TrackSettingsProps<BigBedConfig>) {
  return (
    <TrackSettingsSection title="BigBed">
      <TrackSettingsFieldGrid>
        <TrackSourceUrlField
          required
          value={config.url}
          onCommit={(url) => updateConfig({ url })}
        />
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}
