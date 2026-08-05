import type { BigBedConfig, TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

export function BigBedSettings({ config, updateConfig }: TrackSettingsProps<BigBedConfig>) {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={config.url}
              onCommit={(url) => updateConfig({ url })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
